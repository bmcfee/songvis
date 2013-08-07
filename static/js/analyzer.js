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
var progress_updates = []

// Update position for audio widget
function track_progress(time) {
    progress_updates.forEach(function(update) {
        update(time);
    });
}

// Minute:second string formatter
function num_to_time(x) {
    var mins = Math.floor(x / 60);
    var secs = Math.round(x % 60);

    return d3.format('2d')(mins) + ':' + d3.format('02d')(secs);
}

// Render the analysis widgets
function process_analysis(analysis) {

    // Push a phantom beat at 0
    if (analysis['beats'][0] > 0) {
        analysis['beats'].unshift(0.0);
    }
    analysis['beats'].push(analysis['duration']);

    // Header info
//     $("#song_name")
//         .text(analysis['filename']);
//     $("#duration")
//         .text(num_to_time(analysis['duration']));
    $("#tempo")
        .text(analysis['tempo'].toFixed(2) + ' BPM');

    draw_meta( analysis['metadata'] );

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
    draw_heatmap(analysis['chroma'], analysis['beats'], '#chroma');


    // Plot the spectrogram
    draw_heatmap(analysis['spectrogram'], analysis['beats'], '#spectrogram');

    // Draw the structure bundle

    draw_structure(analysis['beats'], analysis['links'], analysis['segments'], '#structplot');
}

function draw_meta(values) {

    var title   = 'n/a';
    var artist  = 'n/a';
    var album   = 'n/a';
    var date    = 'n/a';

    if (values['title'])    {  title = values['title'][0];      }
    if (values['artist'])   {  artist = values['artist'][0];    }
    if (values['album'])    {  album = values['album'][0];      }
    if (values['date'])     {  date = values['date'][0];        }

    $("#track_title").text(title);
    $("#track_artist").text(artist);
    $("#track_album").text(album);
    $("#track_date").text(date);
}

function draw_beats(values) {
    var margin  = {left: 60, right: 0, top: 0, bottom: 20},
        width   = $('.plot').width()   - margin.left   - margin.right,
        height  = $('.beats').height()  - margin.top    - margin.bottom;

    var beats = [];

    for (var i = 0; i < values.length - 1; i++) {
        beats.push({beat: i, time: values[i], duration: values[i+1] - values[i]});
    }

    var colors = d3.scale.ordinal()
                    .domain(d3.range(0, 4))
                    .range(colorbrewer.PuBu[4]);

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

    var svg     = d3.select("#beats")
                    .append('svg')
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

    var zoomable = svg.append('g').attr('clip-path', 'url(#clip)');
    
    zoomable.selectAll('.bar')
                .data(beats)
            .enter().append('rect')
                .attr('class', 'bar')
                .attr('y',      function(d) { return y(0); })
                .attr('height', function(d) { return y.rangeBand(); })
                .attr('fill',   function(d) { return colors(d.beat % 4); })
                .attr('stroke', 'none')
            .append('svg:title')
                .text(function(d) {
                    return 'Beat duration: ' + d3.format('.02f')(d.duration) + 's';
                });

    function update(domain) {
        x.domain(domain);
        svg.select('.x.axis').call(xAxis);

        svg.selectAll('.bar')
            .attr('x',      function(d) { return x(d.time); })
            .attr('width',  function(d) { return x(d.duration) - x(0); });

    }
    update(d3.extent(values));

    brush_updates.push(update);

    var time_to_beat    = d3.scale.quantize()
                                .domain(beats.map(function(d) { return d.time; }))
                                .range(beats);

    var marker = zoomable.append('rect')
                    .datum(time_to_beat(0))
                    .attr('class', 'bar')
                    .attr('y', y(0))
                    .attr('height', y.rangeBand())
                    .attr('fill', 'red')
                    .attr('stroke', 'red')
                    .attr('fill-opacity', '0.25');

    function update_marker(xpos) {
        var b = time_to_beat(xpos);
        marker.datum(b);
        marker.attr('x', x(b.time));    // get the position and width of the current beat
        marker.attr('width', x(b.duration) - x(0));
    }
    update_marker(0);
    progress_updates.push(update_marker);
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

    var svg  = d3.select("#signal").append('svg')
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
      .attr("y", 0)
      .attr("height", height);

    var marker = svg.append('g');
    
    marker.append('line')
                .attr('x1', 0).attr('x2', 0)
                .attr('y1', 0).attr('y2', height)
                .attr('class', 'marker');

    function update(xpos) {
        marker.attr('transform', 'translate(' + x(xpos) + ',0)');
    }
    update(0);
    progress_updates.push(update);
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
    for (var i = 0; i < values.length; i++) {
        my_values.push({t: beats[i], v: values[i]});
    }
    // dupe the last value to span the full range
    my_values.push({t: beats[beats.length-1], v: values[values.length-1]});

    y.domain( range || d3.extent(my_values, function(d) { return d.v; }));

    var line = d3.svg.line()
                .interpolate('monotone')
                .x(function(d) { return x(d.t); })
                .y(function(d) { return y(d.v); });

    var svg     = d3.select(target).append('svg')
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
    update(d3.extent(beats)); 

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

function draw_heatmap(features, beats, target, yAxis, range) {

    var margin = {left: 60, top: 0, right: 0, bottom: 40},
        width   = $('.plot').width() - margin.left - margin.right,
        height  = $('.heatmap').height() - margin.top - margin.bottom;

    var extent = [0, beats[beats.length-1]];

    var n_bins = features[0].length;


    var color = d3.scale.linear()
        .domain(range || d3.extent(flatten(features)))
        .range([$('body').css('background'), $('body').css('color')])
        .interpolate(d3.interpolateLab);

    var x = d3.scale.linear().range([0, width]).domain(extent);

    var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(num_to_time);

    var y = d3.scale.linear()
                .range([height, 0])
                .domain([0, n_bins]);

    var svg = d3.select(target).append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    svg.append("defs").append("clipPath").attr("id", "clip")
        .append("rect")
            .attr("width", width)
            .attr("height", height);

    svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height + margin.top) + ')');

    if (yAxis) {
        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
    }

    var nodes = [];
    var zoomers = svg.append('g').attr('clip-path', 'url(#clip)');
    var cols = []

    for (var i = 0; i < beats.length-1; i++) {

        var my_data = {x: beats[i], width: x(beats[i+1] - beats[i]), values: features[i]};
        cols.push(my_data);

        var beat_stack = zoomers.append('g').datum(my_data)
                            .attr('class', 'heatmap-bar')
                            .attr('transform', 'translate(' + x(my_data.x) + ', 0) scale(1, 1)');

        for (var j = 0; j < n_bins; j++) {
            beat_stack.append('rect')
                    .attr('x', 0)
                    .attr('width', my_data.width)
                    .attr('y', y(j + 1))
                    .attr('height', Math.abs(y(1) - y(0)))
                    .style('fill', color(features[i][j]))
                    .style('stroke', color(features[i][j]));
        }

    }

    function update(domain) {
        var scale = (extent[1] - extent[0]) / (domain[1] - domain[0]);

        x.domain(domain);
        svg.select('.x.axis').call(xAxis);
        zoomers.selectAll('.heatmap-bar')
                .attr('transform', function(d) { 
                    return 'translate(' + x(d.x) + ', 0) scale(' + scale + ',1)'; 
                } );
    }
    update(extent);

    brush_updates.push(update);

    var time_to_column = d3.scale.quantize()
                            .domain(beats.slice(0, beats.length-1))
                            .range(cols);

    var marker = zoomers.append('rect')
                    .attr('class', 'heatmap-bar')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('height', d3.max(y.range()))
                    .style('fill', 'red')
                    .style('fill-opacity', '0.25')
                    .style('stroke', 'none');

    function update_marker(xpos) {
        var scale = (extent[1] - extent[0]) / (x.domain()[1] - x.domain()[0]);

        var b = time_to_column(xpos);

        marker.datum(b);
        marker.attr('transform', 'translate(' + x(b.x) + ',0) scale(' + scale + ',1)')
            .attr('width', b.width);
    }
    update_marker(0);
    progress_updates.push(update_marker);
}

function draw_structure(beats, beat_links, segments, target) {

    var margin = {left: 60, right: 0, top: 0, bottom: 0};
    var diameter = $('#structplot').width() - margin.left - margin.right;

    var radius = diameter / 2;
    var radius_i = radius - 24;

    var svg = d3.select(target).append('svg')
                    .attr("width", diameter + margin.left + margin.right)
                    .attr("height", diameter + margin.top + margin.bottom)
                .append('g')
                    .attr(  'transform', 
                            'translate(' + (radius + margin.left) + ',' + (radius + margin.top) + ')');

    var cluster = d3.layout.cluster()
                    .size([360, radius_i])
                    .sort(null)
                    .value(function(d) { return d.size; });
    
    var bundle  = d3.layout.bundle();
                    
    // Build the nodes: root -> segments -> beats

    function build_nodes() {
        var map = {};
        function new_node(name) {
            if (! map[name]) {
                map[name] = {name: name, children: [], key: name, leaf: false};
            }
        }

        // push the root
        new_node('');

        // push each segment
        for (var i = 0; i < segments.length; i++) {
            var node_name = 'segment_' + i

            new_node(node_name);
            map[node_name].parent = map[''];
            map[''].children.push(map[node_name])

            d3.range(segments[i], segments[i+1] || beats.length).forEach(function(b) {
                var beat_name = 'beat_' + b;
                
                new_node(beat_name);
                map[beat_name].parent   = map[node_name];
                map[beat_name].segment  = i;
                map[beat_name].time     = beats[b];
                map[beat_name].beat_num = b;
                map[beat_name].leaf     = true;

                map[node_name].children.push(map[beat_name]);
            });
        }
        return map[''];
    }
    function build_links(nodes) {
        var map = {}, links = [];

        // map nodes by name
        nodes.forEach(function(b) {
            map[b.name] = b;
        });

        // build the links
        for (var i = 0; i < beat_links.length; i++) {
            var source_name = 'beat_' + i;

            beat_links[i].forEach(function (target) {
                var target_name = 'beat_' + target;
                links.push({source: map[source_name], target: map[target_name]});
            });
        }
        return links;
    }

    var nodes = cluster.nodes(build_nodes());
    var links = build_links(nodes);

    var line    = d3.svg.line.radial()
                    .interpolate('bundle')
                    .tension(.85)
                    .radius(function(d) { return d.y; })
                    .angle(function(d) { return d.x / 180 * Math.PI; });

    svg.selectAll(".link")
            .data(bundle(links))
        .enter().append("path")
            .attr("class", "link")
            .attr("d", line);

    var arcs = svg.append('g');

    var colors = d3.scale.category20();

    for (var i = 0; i < segments.length; i++) {
        // get the extent
        var angles = nodes.filter(function(n) { return n.segment == i; }).map(function(n) {
            return n.x;
        });

        var segment_arc = d3.svg.arc()
                    .startAngle(angles[0]/ 180 * Math.PI)
                    .endAngle(angles[angles.length-1] / 180 * Math.PI)
                    .innerRadius(radius_i)
                    .outerRadius(radius_i + 16);
                    
        arcs.append('path')
            .attr('d', segment_arc)
            .style('stroke', 'none')
            .style('fill', colors(i));
    }

    // time -> beat -> angle

    var beat_to_angle = nodes.filter(function(n) { return n.leaf; }).map(function(n) {
        return {beat_time: n.time, angle: n.x};
    });

    var time_to_angle = d3.scale.linear()
                            .domain(beat_to_angle.map(function(b) { return b.beat_time; }))
                            .range(beat_to_angle.map(function(b) { return b.angle; }));

    var marker = svg.append('g');
    marker.append('line')
                .attr('x1', 0).attr('x2', 0)
                .attr('y1', -radius_i).attr('y2', 0)
                .attr('class', 'marker');

    function update(xpos) {
        marker.attr('transform', 'rotate(' + time_to_angle(xpos) + ')');
    }
    update(0);
    progress_updates.push(update);
}

