// Retrieve the analysis object
$.ajax({
    url: "/data",
    data: {song_id: $("#song_id").val()},
    dataType: "json"
}).done(process_analysis);

function num_to_time(x) {
    var mins = Math.round(x / 60);
    var secs = Math.round(x % 60);

    return d3.format('2d')(mins) + ':' + d3.format('02d')(secs);
}

function process_analysis(analysis) {

    // Header info
    $("#song_name")
        .text(analysis['filename']);
    $("#duration")
        .text(num_to_time(analysis['duration']));
    $("#tempo")
        .text(analysis['tempo'].toFixed(2) + 'BPM');

    // Plot the beat chart
    draw_beats(analysis['beats']);

    // Plot the pitches
    draw_heatmap(analysis['pitches'], '#pitches');

    // Plot the timbres
    draw_heatmap(analysis['timbres'], '#timbres');
}

function draw_beats(beats) {

    var beat_times = [];

    for (var i = 1; i < beats.length; i++) {
        beat_times.push({key: 'Beat ' + i,
                         values: [{x: 0, y: beats[i] - beats[i-1]}]});
    }

    nv.addGraph(function() {
        var chart = nv.models.multiBarHorizontalChart();

        chart.showControls(false)
            .showLegend(false)
            .stacked(true);

        chart.xAxis.tickFormat(function() {return null;});
        chart.yAxis.tickFormat(num_to_time);
        chart.color(d3.scale.category20c().range().slice(0,4));
        chart.tooltip(function(key, x, y, e, graph) {
            return '<span class="label label-info">' + key + ': ' + d3.format('0.2f')(e['value']) + 's';
        });

        d3.select('#beats svg')
            .datum(beat_times)
            .call(chart);
    
        nv.utils.windowResize(chart.update);
    
        return chart;
    });
}

function draw_heatmap(features, target) {

}
