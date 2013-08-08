// Retrieve the song index
function update(start) {
    $.ajax({
        url: '/songs/' + start,
        dataType: 'json'
    }).done(build_index);
}

var start = 0;
update(start);

function previous() {
    if ($('.previous').hasClass('disabled')) {
        return;
    }
    start = Math.max(0, start - 10);
    update(start);
}

function next() {
    if ($('.next').hasClass('disabled')) {
        return;
    }
    start = start + 10;
    update(start);
}

function build_index(index) {

    var songs = index.songs;

    var index_list = $("#index-list");

    $("#index-list > a").remove();

    for (var i = 0; i < songs.length; i++) {
        // Construct the list item link
        var item = $('<a href="/vis/' + songs[i].key + '">');
        item.addClass('list-group-item');

        // Add meta-data to it
        item.append('<h4 class="list-item-group-heading">' + songs[i].meta.title[0] + '</h4>');
        item.append('<span class="list-item-group-text">' + songs[i].meta.artist[0] + '</span>');
        
        index_list.append(item);
    }

    var range = index.range;
    console.log(range);

    $('#song-start').text(range.start);
    $('#song-end').text(range.end);
    $('#song-total').text(range.num_songs);
    if (range.start > 0) {
        $(".previous").removeClass('disabled');
    } else {
        $(".previous").addClass('disabled');
    }

    if (range.end < range.num_songs - 1) {
        $(".next").removeClass('disabled');
    } else {
        $(".next").addClass('disabled');
    }
}
