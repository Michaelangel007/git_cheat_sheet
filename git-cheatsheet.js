var clickMode = false;
var log = function (x) {
  console.log(x)
}
var logJSON = function (x) {
  console.log(JSON.stringify(x))
}

var KEY_1 = 49
var KEY_2 = 50
var KEY_3 = 51
var KEY_4 = 52
var KEY_5 = 53
var KEY_H = 72
var KEY_I = 73
var KEY_J = 74
var KEY_K = 75
var KEY_L = 76
var KEY_O = 79
var KEY_R = 82
var KEY_S = 83
var KEY_W = 87
var KEY_FN1 = 112
var KEY_FN2 = 113
var KEY_FN3 = 114
var KEY_FN4 = 115
var KEY_FN5 = 116
var KEY_PAGE_UP = 38
var KEY_PAGE_DN = 40
var KEY_PAGE_LEFT = 37
var KEY_PAGE_RGHT = 39


function showDocs(doc, cmd) {
  var $info = $('#info');
  if (doc) {
    $info.find('.cmd').html('<span>' + cmd + '</span>');
    $info.find('.doc').html(doc);
    $info.slideDown()
  } else {
    $info.hide()
  }
}

function showDocsForElement($el) {
  var doc = $el.attr('data-docs') || '',
    cmd = $el.text();
  showDocs(doc, cmd);
}


function currentLoc() {
  return $('#diagram .loc.current').attr('id');
}

function selectLoc(id) {

  id = id || ''

  clickMode = false;
  $('#commands>div').removeClass('selected');
  $('body').removeClass('stash workspace index local_repo remote_repo').addClass(id);
  $('#diagram .loc.current').removeClass('current');
  $('#' + id).addClass('current');

  showDocsForElement($('#' + id));

  window.document.title = '' + id.replace('_', ' ') + ' :: Git Cheatsheet'

  text  = window.location.href;
  found = text.indexOf( '#' ); // loc=' + id );

  if( found >= 0 )
  {
    head = text.substr( 0, found );
    tail = text.substr( found, text.length );
    loc  = '#loc=' + id + ';';

    if( tail != loc )
      window.location.href = head + loc ;
  }
}

function selectCommand($cmd) {
  $('#commands>dt').removeClass('selected');
  $cmd.addClass('selected');

  var doc = $cmd.next('dd').text() || '',
    cmd = 'git ' + $cmd.html();
  showDocs(doc, cmd);
}


$(function () {

  (function addBarsToLocDivs() {
    jQuery('.loc').append('<div class="bar" />');
  })();


  var popStateLoc$ = Rx.Observable.fromEvent(window, 'popstate')
    .startWith(null) // on initial page view
    .map(function () {
      var m = (window.location.hash || '').match(/loc=([^;]*);/);
      if (m && m.length == 2) {
        return m[1]
      }
    })
    .filter(function (loc) {
      return !!loc || loc == ''
    })

  var clickLoc$ = Rx.Observable.fromEvent(document, 'click', '#diagram .loc')
    .filter(function (ev) {
      return $(ev.target).closest('dt').length == 0
    })
    .map(function (ev) {
      return $(ev.target).hasClass('loc') ?
        ev.target.id :
        $(ev.target).closest('.loc').attr('id')
    })

  var clickCmd$ = Rx.Observable.fromEvent(document, 'click', '#commands > dt')
    .map(function (ev) {
      return $(ev.target).is('dt') ? ev.target : $(ev.target).closest('dt').get(0)
    })
    .filter(function (el) {
      return !!el
    })
    .map(function (el) {
      clickMode = !clickMode || (clickMode && !$(el).hasClass('selected'))
      return clickMode ? el : '#nothing'
    })

  var mouseOverDataDoc$ = Rx.Observable.fromEvent(document, 'mousemove', '[data-docs]')
    //.debounce(100)
    .filter(function (ev) {
      return !$(ev.target).is('dt') && $(ev.target).closest('dt').length == 0
    })
    .map(function (ev) {
      return $(ev.target).is('[data-docs]') ? ev.target : $(ev.target).closest('[data-docs]').get(0)
    })
    .filter(function (el) {
      return !clickMode || !$(el).hasClass('loc')
    })
    .distinctUntilChanged()

  var mouseOverCmd$ = Rx.Observable.fromEvent(document, 'mousemove', '#commands>dt:not(:selected)')
    .filter(function () {
      return !clickMode
    })
    .map(function (ev) {
      return $(ev.target).is('dt') ? ev.target : $(ev.target).closest('dt').get(0);
    })
    .filter(function (el) {
      return $(el).is('dt')
    })
    .distinctUntilChanged()


  var keydown$ = Rx.Observable.fromEvent(document, 'keydown')
  //keydown$.map(function(ev) {return ev.keyCode }).subscribe(log)

  var keyDownNextLoc$ = keydown$.filter(function (e) {
    return e.keyCode == KEY_PAGE_RGHT || e.keyCode == KEY_L
  })
    .map(function () {
      return next(locations, currentLoc())
    })

  var keyDownPrevLoc$ = keydown$.filter(function (e) {
    return e.keyCode == KEY_PAGE_LEFT || e.keyCode == KEY_H
  }).map(function () {
    return prev(locations, currentLoc())
  })

  var specificLoc$ = keydown$
    .pluck('keyCode')
    .map(function (keyCode) {
      switch (keyCode) {
        case KEY_1:
        case KEY_FN1:
        case KEY_S:
              return locations[0]; // CLEANUP: 'stash'
        case KEY_2:
        case KEY_FN2:
        case KEY_W:
              return locations[1]; // CLEANUP: 'workspace'
        case KEY_3:
        case KEY_FN3:
        case KEY_I:
              return locations[2]; // CLEANUP: 'index'
        case KEY_4:
        case KEY_FN4:
        case KEY_O:
              return locations[3]; // CLEANUP: 'local_repo'
        case KEY_5:
        case KEY_FN5:
        case KEY_R:
              return locations[4]; // CLEANUP: 'remote_repo'
      }
    })
    .filter(function(loc) { return !!loc} )

  // Select a Loc
  clickLoc$
    .merge(keyDownNextLoc$)
    .merge(keyDownPrevLoc$)
    .merge(popStateLoc$)
    .merge(specificLoc$)
    .subscribe(function (newLoc) {
      selectLoc(newLoc)
    })

  var keyDownNextCmd$ = keydown$.filter(function (e) {
    return e.keyCode == KEY_PAGE_DN || e.keyCode == KEY_J
  })

  var nextCmd$ = keyDownNextCmd$.map(function () {
    var cmds = $('#commands>dt:visible').toArray();
    return next(cmds, $('#commands>dt.selected')[0]);
  })

  var keyDownPrevCmd$ = keydown$.filter(function (e) {
    return e.keyCode == KEY_PAGE_UP || e.keyCode == KEY_K
  })

  var prevCmd$ = keyDownPrevCmd$.map(function () {
    var cmds = $('#commands>dt:visible').toArray();
    return prev(cmds, $('#commands>dt.selected')[0]);
  })


  // Select a command
  nextCmd$
    .merge(prevCmd$)
    .merge(mouseOverCmd$)
    .merge(clickCmd$)
    .filter(function (el) {
      return !!el
    })
    .map($)
    .subscribe(selectCommand)

  mouseOverDataDoc$.subscribe(function (el) {
    showDocsForElement($(el));
  })


  var lang = detectLanguage(navigator);

  // Fallback to English if the language is not translated
  if (!translations[lang]) {
    lang = "en";
  }

  $('[data-lang=' + lang + ']').addClass('selected')

  $('.lang').on('click', function () {
    var newLang = $(this).attr('data-lang');
    cookies.create('lang', newLang)
    document.location.reload();
  })


  // Build locations
  $.each(locations, function (i, loc) {
    $('#' + loc).attr('data-docs', esc(translations[lang].locations.docs[loc])).
      find('h5').html(translations[lang].locations[loc])
  })

  // Build commands
  var leftOffset = $('#commands').empty().offset().left;

var x  = 0;
var y  = 0;
var dropShadowW = 2*3 + 2; // Styles.js: .loc has: boxShadow([3, 3], 2, '#ccc')
var w  = 0;
var h  = 0;

    var aColumnNamesToIndex = {};
    var aColumnWidths       = new Array( locations.length );
    var aCommands           = new Array(  commands.length );

    // First, save original columns width
    x = 0;
    $.each(locations,function(i,loc) {
        w = $('#' + loc).innerWidth();

        if (w < 220) { // HACK: Hard-coded max status width
            w = 220;
            $('#' + loc).css('width', w + 'px');
        }

        if( i > 0 )
            x += w;

        aColumnWidths      [ i   ] = w;
        aColumnNamesToIndex[ loc ] = i;
    });

    // Second, Add all the elements
    for (var i = 0; i < commands.length; i++) {
        var c     = commands[i];
        var cmd   = translations[lang].commands[c.key].cmd

        var left  = $("#" + c.left  + " div.bar").offset().left - leftOffset;
        var right = $("#" + c.right + " div.bar").offset().left - leftOffset;
        var width = right - left;
        var iCol  = aColumnNamesToIndex[ c.left ];

        var id    = "";

    if (width < 1) {
        left = $('#' + c.left).offset().left -  leftOffset;
        width = aColumnWidths[ iCol ] - dropShadowW;
    } else {
        left  += 10; //   indent
        width -= 20; // 2*indent
    }

    x = left;

        aCommands[ i ] = // $e
            $("<dt>" + id + esc(cmd) + "<div class='arrow' /></dt>").
              css('margin-left', x + 'px').
              css('margin-top' , y + 'px').
              css('width', width + 'px').
              addClass( c.left ).
              addClass( c.right ).
              addClass( c.direction );
        $('#commands').append( aCommands[ i ] ); // $e

var sColor ='linear-gradient(right,#'+ colors[c.left]+',#'+ colors[c.right]+')';
        aCommands[i].css('background', sColor ).
            css('background-color','').
            css('color','');

        // Have a new column?
        if( (i > 0) && (c.left != commands[i-1].left) )
        {
var pos = aCommands[i-1].position().top;
var off = aCommands[i-1].offset().top;

            var br = $("<hr>").
                css('position', "relative" ).
                css('top', h + $('#' + c.left).offset().top + 'px' );
$('#diagram').append( br );
last = i;

        }
h += parseInt( aCommands[i].css('line-height').replace('px','') ); // font-size -> line-height

        var docs = translations[lang].commands[c.key].docs
        if(docs ) {
              var $doc = $('<dd></dd>').text(esc(docs));
              $('#commands').append($doc);
        }
    }

// Styles.js -- builds the divs for the columns
// This fills in the divs per column
//  {
//    left     : "workspace", // From Left  Column
//    right    : "index"    , // To   Right Column
//    direction: "status"   , // name
//    key      : "status"   , // name
//    tags: "Basic Snapshotting" // 
//  }
// direction is css style
//    status - box, grey background = styles.js -- statusColor
//    up     - right arrow, color of column
//    dn     - left arrow, color of column
});
