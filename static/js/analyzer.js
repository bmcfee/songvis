// Retrieve the analysis object
$.ajax({
    url: "/data",
    data: {song_id: $("#song_id").val()},
    dataType: "json"
}).done(process_analysis);

function num_to_time(x) {
    var mins = Math.floor(x / 60);
    var secs = Math.round(x % 60);

    return d3.format('2d')(mins) + ':' + d3.format('02d')(secs);
}

function process_analysis(analysis) {

    // Push a phantom beat at 0
    if (analysis['beats'][0] > 0) {
        analysis['beats'].unshift(0.0);
    }

    // Header info
    $("#song_name")
        .text(analysis['filename']);
    $("#duration")
        .text(num_to_time(analysis['duration']));
    $("#tempo")
        .text(analysis['tempo'].toFixed(2) + ' BPM');

    // Plot the beat chart
    draw_beats(analysis['beats']);

    // Plot the pitches
    draw_heatmap(analysis['pitches'], analysis['beats'], '#pitches');

    // Plot the timbres
//     draw_heatmap(analysis['timbres'], analysis['beats'], '#timbres');
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

function draw_heatmap(features, beats, target) {

    var n = features[0].length;
    var H = 16;
    var W = 4;
    var svg = d3.select(target + " svg");

    var offsets = []
    for (var i = 1; i < beats.length; i++) {
        offsets.push(beats[i] - beats[i-1]);
    }

    var nodes = [];
    for (var i = 0; i < offsets.length; i++) {
        for (var j = 0; j < features[i].length; j++) {
            nodes.push({ 
                x:      beats[i], 
                w:      offsets[i],
                y:      j, 
                value:  features[i][j]});
        }
    }

    function rgb(z) {
        var v = [z,z,z];
        return 'rgb(' + v.map(function(r){return Math.round(r * 256);}).join(',') + ')';
    }

    var h_nodes = svg.append('g').attr('transform', 'transform(60, 0)');

    h_nodes
        .selectAll('rect')
        .data(nodes)
        .enter().append('rect')
            .attr('x', function(node) { return 60 + node.x * W; })
            .attr('y', function(node) { return node.y * H; })
            .attr('width', function(node) {return node.w * W; })
            .attr('height', function(node) {return H;})
            .style('fill', function(node) { return rgb(1-node.value); })
            .style('stroke', function(node) { return null; });

}

