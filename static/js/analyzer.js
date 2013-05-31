// Retrieve the analysis object
$.ajax({
    url: "/data",
    data: {song_id: $("#song_id").val()},
    dataType: "json"
}).done(process_analysis);

function num_to_time(x) {
    var mins = Math.round(x / 60);
    var secs = Math.round(x % 60);

    return mins.toFixed(0) + ':' + secs.toFixed(0);
}

function process_analysis(analysis) {
    console.log(analysis);
    $("#song_name").text(analysis['filename']);
    $("#duration").text(num_to_time(analysis['duration']));
    $("#tempo").text(analysis['tempo'].toFixed(2) + 'BPM');
}
