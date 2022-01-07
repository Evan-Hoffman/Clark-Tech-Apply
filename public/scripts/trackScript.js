  $(document).ready(function() {
    $('[id="track_form"]').on('submit', function(event) {
        event.preventDefault();
                            
        let jobinfo = $(this).serializeArray();
        let jid = {};

        jobinfo.forEach((value) => {               
            jid[value.name] = value.value;
        });
        let url = "/auth/track";

        $.ajax({
            method: "POST",
            url: url,
            data: jid
        }).done();
    });
});

$(document).ready(function() {
        $('[id="track_form"]').on('submit', function(event) {

       var $btn = $(this).replaceWith("<button class='btn btn-info' disabled>+</button>");
    });
});
