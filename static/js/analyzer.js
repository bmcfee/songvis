// Initialize tabs
$(function() { 
    $('.tabs').tab();
});

// Retrieve the analysis object
$.ajax({
    url: "/data/" + $("#song_id").val(),
    dataType: "json"
}).done(process_analysis);

// array container for brush updates
var brush_updates = []

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


    draw_zoom( analysis['signal'], analysis['duration']);

    // Plot the beat chart
    draw_beats(analysis['beats']);

    // Plot the loudness chart
    draw_line(analysis['loudness'], 
                analysis['beats'], 
                '#loudness',
                [d3.min(analysis['loudness']), 0.0]);

    // Plot the harmonicity chart
    draw_line(analysis['harmonicity'], 
                analysis['beats'], 
                '#harmonicity',
                [d3.min(analysis['harmonicity']), 1.0]);

    // Plot the chromagram
    draw_heatmap(analysis['chroma'], analysis['beats'], '#chroma', [0.0, 1.0]);


    // Plot the spectrogram
    draw_heatmap(analysis['spectrogram'], analysis['beats'], '#spectrogram');
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
                .range([0, width])
                .domain(d3.extent(values));

    var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(num_to_time);

    var y = d3.scale.ordinal()
                .domain([0])
                .rangeRoundBands([0, height], 0);


    var svg     = d3.select("#beats svg")
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")");


    svg.append("defs").append("clipPath").attr("id", "clip")
        .append("rect")
            .attr("width", width)
            .attr("height", height);

    var zoomable = svg.append('g').attr('clip-path', 'url(#clip)')
                    .selectAll('.bar')
                        .data(beats)
                    .enter().append('rect')
                        .attr('class', 'bar')
                        .attr('y',      function(d) { return y(0); })
                        .attr('height', function(d) { return y.rangeBand(); })
                        .attr('fill',   function(d) { return colors[d.beat % 4]; })
                        .attr('stroke', 'none')
                    .append('svg:title')
                        .text(function(d) {return 'Duration: ' + d3.format('.02f')(d.duration);});

    function update(domain) {
        x.domain(domain);
        svg.select('.x.axis').call(xAxis);

        svg.selectAll('.bar')
            .attr('x',      function(d) { return x(d.time); })
            .attr('width',  function(d) { return x(d.duration) - x(0); });

    }
    update(d3.extent(values));

    brush_updates.push(update);
}

function draw_zoom(signal, duration) {
    var real_time = d3.scale.linear()
                        .domain([0, signal.length])
                        .range([0, duration]);

    var margin  = {left: 60, right: 0, top: 0, bottom: 20},
        width   = $('.plot').width() - margin.left - margin.right,
        height  = $('.zoomwindow').height() - margin.top - margin.bottom;


    var x = d3.scale.linear().range([0, width]).domain([0, duration]);
    var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(num_to_time);

    var y = d3.scale.linear().range([height, 0]).domain(d3.extent(signal));
    var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

    var my_values = [];
    for (var i = 0; i < signal.length; i++) {
        my_values.push({t: real_time(i), v: signal[i]});
    }


    var line = d3.svg.line()
                .x(function(d) { return x(d.t); })
                .y(function(d) { return y(d.v); });

    var svg  = d3.select("#signal svg")
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, ' + height + ')')
            .call(xAxis);
    
    svg.append('path')
            .datum(my_values)
            .attr('class', 'line')
            .attr('d', line);


    var brush = d3.svg.brush()
        .x(x)
        .on('brush', _brushed);

    function _brushed() {
        brush_updates.forEach(function(update) { 
            update(brush.empty() ? x.domain() : brush.extent());
        } );
    }

    svg.append("g")
      .attr("class", "x brush")
      .call(brush)
    .selectAll("rect")
      .attr("y", -6)
      .attr("height", height + 7);

}

function draw_line(values, beats, target, range) {
    

    var margin  = {left: 60, right: 0, top: 20, bottom: 20},
        width   = $('.plot').width() - margin.left - margin.right,
        height  = $('.lines').height() - margin.top - margin.bottom;

    var x = d3.scale.linear().range([0, width]);
    var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(num_to_time);

    var y = d3.scale.linear().range([height, 0]);
    var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left')
                    .ticks(5);

    var my_values = [];
    for (var i = 0; i < beats.length; i++) {
        my_values.push({t: beats[i], v: values[i]});
    }

    y.domain( range || d3.extent(my_values, function(d) { return d.v; }));

    var line = d3.svg.line()
                .interpolate('monotone')
                .x(function(d) { return x(d.t); })
                .y(function(d) { return y(d.v); });

    var svg     = d3.select(target + " svg")
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, ' + height + ')');

    svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

    svg.append("defs").append("clipPath").attr("id", "clip")
        .append("rect")
            .attr("width", width)
            .attr("height", height);

    var zoomable = svg.append('path')
            .datum(my_values)
            .attr("clip-path", "url(#clip)")
            .attr('class', 'line');

    function update(domain) {
        x.domain(domain);
        svg.select('.x.axis').call(xAxis);
        zoomable.attr('d', line);
    }
    update(d3.extent(my_values, function(d) { return d.t; }));

    brush_updates.push(update);
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

function draw_heatmap(features, beats, target, range) {

    var margin = {left: 60, top: 0, right: 0, bottom: 40},
        width   = $('.plot').width() - margin.left - margin.right,
        height  = $('.heatmap').height() - margin.top - margin.bottom;

    var nodes = [];
    for (var i = 0; i < beats.length-1; i++) {
        for (var j = 0; j < features[i].length; j++) {
            nodes.push({ 
                x:      beats[i], 
                w:      beats[i+1]-beats[i],
                y:      j, 
                value:  features[i][j]});
        }
    }

    var color = d3.scale.linear()
        .domain(range || d3.extent(flatten(features)))
        .range(["steelblue", "white"])
        .interpolate(d3.interpolateLab);

    var x = d3.scale.linear().range([0, width]);
    var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(num_to_time);

    var y = d3.scale.linear().range([height, 0])
                .domain([0, features[0].length]);

    var svg = d3.select(target + " svg")
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    svg.append("defs").append("clipPath").attr("id", "clip")
        .append("rect")
            .attr("width", width)
            .attr("height", height);

    var zoomers = svg.append('g').attr('clip-path', 'url(#clip)')
                    .selectAll('rect')
                        .data(nodes)
                    .enter().append('rect')
                        .attr('y', function(node) { return y(node.y); })
                        .attr('height', function(node) {return Math.abs(y(node.y + 1) - y(node.y));})
                        .style('fill', function(node) { return color(node.value); })
                        .style('stroke', 'none');


    svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + margin.left + ',' + (height + margin.top) + ')');

    function update(domain) {
        x.domain(domain);
        svg.select('.x.axis').call(xAxis);
        zoomers
            .attr('x', function(node) { return x(node.x); })
            .attr('width', function(node) {return x(node.x + node.w) - x(node.x); })
    }
    update([0, d3.max(nodes, function(d) { return d.x + d.w; })]);

    brush_updates.push(update);
}

