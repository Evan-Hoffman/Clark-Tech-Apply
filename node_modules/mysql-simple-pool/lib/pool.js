var mysql = require('mysql');

/**
 * Represents the class managing a MySQL connection pool for node-mysql. The
 * connection pool accepts an options object which is passed to the node-mysql
 * createConnection function to establish a connection. A maximum number of
 * connections can be configured.
 *
 * @param maximumNumberOfConnections The maximum number of connections.
 * @param options The options with which a connection is created.
 */
function Pool(maximumNumberOfConnections, options) {
	// Initialize public properties.
	if (true) {
		// The maximum number of connections.
		this.maximumNumberOfConnections = maximumNumberOfConnections ? maximumNumberOfConnections : 100;
		// The options with which a connection is created.
		this.options = options ? options : {};
	}
	// Initialize private properties.
	if (true) {
		// The current number of connections being established.
		this._currentNumberOfConnectionsEstablishing = 0;
		// The current number of _connections.
		this._currentNumberOfConnections = 0;
		// The established _connections.
		this._connections = [];
		// Indicates whether the pool has been disposed of.
		this._disposed = false;
		// The _pending operations.
		this._pending = [];
	}
}

/**
 * Claim a managed connection. A claimed connection is not managed by the pool until
 * the connection is rebound. Once the caller has finished using the connection, rebound
 * it using the end function on the connection. This function makes it possible for a
 * transaction to function as intended.
 *
 * @param fn The callback function.
 */
Pool.prototype.claim = function(fn) {
	// Check if the pool has not been disposed of.
	if (!this._disposed) {
		// Check if the connection pool has exhausted each connection.
		if (this._connections.length === 0) {
			// Push the claim to the pending operations.
			this._pending.push({claiming: true, fn: fn});
			// Update the connection pool
			this._update();
		}
		// Otherwise a connection is available.
		else {
			// Retrieve a connection.
			var connection = Pool._connections.pop();
			// Send the connection to the callback function.
			fn(null, connection);
		}
	}
};

/**
 * Dispose of the connection pool. Further queries are ignored, but all pending
 * operations are handled. Once the pending operations have been finished, the
 * connections are removed.
 */
Pool.prototype.dispose = function() {
	// Check if the pool has not been disposed of.
	if (!this._disposed) {
		// Set the status indicating whether the pool has been disposed of.
		this._disposed = true;
	}
};

/**
 * Execute a query. This will add the operation to the pending operations and instructs
 * the connection pool to find an available connection. When a connection is not available,
 * a connection is established. If the maximum number of connections has been reached, the
 * operation will be pending until a connection is returned.
 *
 * @param query The query to execute.
 * @param options The options 
 * @param fn The callback function.
 */
Pool.prototype.query = function(query, options, fn) {
	// Check if the pool has not been disposed of.
	if (!this._disposed) {
		// Check if the options variable is a function.
		if (typeof options == 'function') {
			// Set the callback to the options.
			fn = options;
			// Initialize the options.
			options = {};
		}
		// Push the query to the pending operations.
		this._pending.push({claiming: false, query: query, options: options, fn: fn});
		// Update the connection pool and pending queries.
		this._update();
	}
};

/**
 * Create a managed connection. A managed connection has an event handler to detect
 * connection errors and changes the termination behaviour. Once the managed connection
 * has been established, it is added to the connection pool.
 *
 * @return Indicates whether a connection is being established.
 */
Pool.prototype._create = function() {
	// Check if a connection may be established.
	if (this._currentNumberOfConnections + this._currentNumberOfConnectionsEstablishing < this.maximumNumberOfConnections) {
		// Create a connection.
		var connection = mysql.createConnection(this.options);
		// Retrieve the pool instance.
		var pool = this;
		// Increment the current number of connections being established.
		this._currentNumberOfConnectionsEstablishing++;
		// Connect to the database.
		connection.connect(function(err) {
			// Decrement the current number of connections being established.
			pool._currentNumberOfConnectionsEstablishing--;
			// Check if the connection has been established
			if (!err) {
				// Increment the current number of connections.
				pool._currentNumberOfConnections++;
				// Attach a handler to the error event.
				connection.on('error', function(err) {
					// Check if the connection has been lost.
					if (err.fatal && err.code !== 'PROTOCOL_CONNECTION_LOST') {
						// Decrement the current number of _connections.
						pool._currentNumberOfConnections--;
					}
				});
				// Save the terminate function in case we want to dispose.
				connection._end = connection.end;
				// Change the behaviour of the termination of the connection.
				connection.end = function() {
					// Add the connection to the established _connections.
					pool._connections.push(this);
					// Update the connection pool and _pending queries.
					pool._update();
				};
				// Rebound a managed connection.
				connection.end();
			}
			// Otherwise the connection failed.
			else {
				// Update the connection pool.
				pool._update();
			}
		});
		// Return true.
		return true;
	}
	// Otherwise return false.
	else return false;
};
	
/**
 * Update the connection pool. This method is called whenever a change in the
 * connection pool has occured, handles pending operations and establishes
 * connections.
 */
Pool.prototype._update = function() {
	// Check if a _pending query is available.
	if (this._pending.length !== 0) {
		// Check if a connection is available.
		if (this._connections.length !== 0) {
			// Retrieve a connection.
			var connection = this._connections.pop();
			// Retrieve a _pending query.
			var pending = this._pending.pop();
			// Execute the query using this handler to rebound the connection.
			connection.query(pending.query, pending.options, function(err, results) {
				// Rebound a managed connection.
				connection.end();
				// Send the error and results to the callback function.
				pending.fn(err, results);
			});
		}
		// Otherwise a connection may have to be established.
		else {
			// Iterate until sufficient managed _connections are establishing.
			while (this._currentNumberOfConnectionsEstablishing < this._pending.length) {
				// Create a managed connection.
				if (!this._create()) {
					break;
				}
			}
		}
	}
	// Otherwise check if the pool has been disposed of.
	else if (this._disposed) {
		// Iterate through each connection.
		for (var i = 0; i < this._connections.length; i++) {
			// Terminate the connection.
			this._connections[i]._end();
		}
		// Clear connections.
		this._connections.length = 0;
	}
};

// Export the Pool class.
module.exports = Pool;