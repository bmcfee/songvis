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

    // Plot the loudness chart
    draw_line(analysis['loudness'], analysis['beats'], '#loudness');

    // Plot the harmonicity chart
    draw_line(analysis['harmonicity'], analysis['beats'], '#harmonicity');

    // Plot the pitches
    draw_heatmap(analysis['pitches'], analysis['beats'], '#pitches');

    // Plot the timbres
    draw_heatmap(analysis['timbres'], analysis['beats'], '#timbres');
}

function draw_beats(values) {
    var margin  = {left: 60, right: 0, top: 0, bottom: 20},
        width   = $('.plot').width()   - margin.left   - margin.right,
        height  = $('.beats').height()  - margin.top    - margin.bottom;

    var beats = [];

    for (var i = 0; i < values.length - 1; i++) {
        beats.push({beat: i, time: values[i], duration: values[i+1] - values[i]});
    }

    var colors  = d3.scale.category20c().range().slice(0, 4);

    var x = d3.scale.linear()
                .range([0, width]);

    x.domain(d3.extent(values));

    var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(num_to_time);

    var y = d3.scale.ordinal()
                .domain([0])
                .rangeRoundBands([0, height], 0);


    var svg     = d3.select("#beats svg")
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.selectAll('.bar')
        .data(beats)
        .enter().append('rect')
            .attr('class', 'bar')
            .attr('x',      function(d) { return x(d.time); })
            .attr('y',      function(d) { return y(0); })
            .attr('width',  function(d) { return x(d.duration) - x(0); })
            .attr('height', function(d) { return y.rangeBand(); })
            .attr('fill',   function(d) { return colors[d.beat % 4]; })
            .attr('stroke', 'none');
}

function draw_line(values, beats, target) {
    
    var margin  = {left: 60, right: 0, top: 20, bottom: 20},
        width   = $('.plot').width() - margin.left - margin.right,
        height  = $('.lines').height() - margin.top - margin.bottom;

    var x = d3.scale.linear()
                .range([0, width]);
    var y = d3.scale.linear()
                .range([height, 0]);

    var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(num_to_time);
    var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left')
                    .ticks(5);

    var my_values = [];
    for (var i = 0; i < beats.length; i++) {
        my_values.push({t: beats[i], v: values[i]});
    }

    var line = d3.svg.line()
                .x(function(d) { return x(d.t); })
                .y(function(d) { return y(d.v); });

    var svg     = d3.select(target + " svg")
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    x.domain(d3.extent(my_values, function(d) { return d.t; }));
    y.domain(d3.extent(my_values, function(d) { return d.v; }));

    svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, ' + height + ')')
            .call(xAxis);

    svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

    svg.append('path')
            .datum(my_values)
            .attr('class', 'line')
            .attr('d', line);
}

function flatten(X) {

    var flat = []
    for (var i = 0; i < X.length; i++) {
        for (var j = 0; j < X[i].length; j++) {
            flat.push(X[i][j]);
        }
    }
    return flat;
}

function draw_heatmap(features, beats, target) {

    var margin = {left: 60, top: 20, right: 0, bottom: 0};
    var n = features[0].length;
    var H = ($('.heatmap').height() - margin.top)/ n;
    var W = $('.plot').width() / d3.max(beats);
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

    var color = d3.scale.linear()
        .domain(d3.extent(flatten(features)))
        .range(["white", "steelblue"])
        .interpolate(d3.interpolateLab);

    var h_nodes = svg.append('g').attr('transform', 'transform(' + margin.left + ',' + margin.top + ')');

    h_nodes
        .selectAll('rect')
        .data(nodes)
        .enter().append('rect')
            .attr('x', function(node) { return margin.left + node.x * W; })
            .attr('y', function(node) { return margin.top + node.y * H; })
            .attr('width', function(node) {return node.w * W; })
            .attr('height', function(node) {return H;})
            .style('fill', function(node) { return color(node.value); })
            .style('stroke', 'none');

}

