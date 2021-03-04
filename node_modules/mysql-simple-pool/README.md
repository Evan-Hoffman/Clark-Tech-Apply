mysql-simple-pool
=================

Simple connection pooling for Node and MySQL. 

## Installation

	$ npm install mysql-simple-pool

## Features

	* Connection pooling for [mysql](https://github.com/felixge/node-mysql) by felixge.
	* Dispose is possible to remove all connections.
	* Simple wrapper. Functionality has not been touched at all.
	
## Usage

The connection pool only provides connection management. Queries are executed on the first available managed connection. For all the specifications, read the excellent documentation written by felixge.

### Instantiating a connection pool

A connection pool has to be instantiated. You can provide *maximumNumberOfConnections* and *options*. Options are forwarded when a managed connection is established.

	// Include the module.
	var Pool = require('mysql-simple-pool');
	// Instantiate the pool. Use a maximum of 100 connections.
	var pool = new Pool(100, {
		host: 'localhost',
		user: 'root',
		password: 'root',
		database: 'test'
	});
	
### Performing queries

Queries are queued and executed on the first available connection.

	pool.query('select * from posts', function(err, results) {
		console.log(results);
	});
	
### Claiming a managed connection

A connection can be claimed, at which point is is no longer managed.

	pool.claim(function(err, conn) {
		// I can do sequential queries here. This may be required when
		// you wish to do a transaction, since the queries have to be 
		// sequential.
		conn.end();
	});
	
End the connection to place it back into the connection pool.

### Disposing the connection pool

A node application will not close with open connections.

	pool.dispose();
	
Dispose ensures all pending queries finish, after which all connections are cleared.