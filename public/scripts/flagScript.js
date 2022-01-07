$(document).ready(function() {
    $('[id="flag_form"]').on('submit', function(event) {
        event.preventDefault();
                            
        let info = $(this).serializeArray();
        let suggestionBody = {};

        info.forEach((value) => {               
            suggestionBody[value.name] = value.value;
        });
        let url = "/auth/suggestCorrection";

        $.ajax({
            method: "POST",
            url: url,
            data: suggestionBody
        }).done();

    });
});

$(document).ready(function() {
    $('[id="flag_form"]').on('submit', function(event) {

         $("#message_toggle").html("Correction Submitted for review").css("opacity", 1).fadeIn(1000);
         $("#message_toggle").css("opacity", 1).fadeOut(1000);
         
});
});