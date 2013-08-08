#!/usr/bin/env python

import flask
import ConfigParser
import sys
import os
import ujson as json

DEBUG = True
SECRET_KEY = 'yodawg'

# construct application object
app = flask.Flask(__name__)
app.config.from_object(__name__)

def loadConfig(server_ini):
    P       = ConfigParser.RawConfigParser()

    P.optionxform    = str
    P.read(server_ini)

    CFG = {}
    for section in P.sections():
        CFG[section] = dict(P.items(section))

    for (k, v) in CFG['server'].iteritems():
        app.config[k] = v

    return CFG

def load_index(index_file):
    with open(index_file, 'r') as f:
        idx = json.load(f)

    return idx

def run(**kwargs):
    # load the index
    app.index = load_index(app.config['index'])

    app.run(**kwargs)

@app.route('/health-check', methods=['GET'])
def healthcheck():
    return {'status': 'OK'}

@app.route('/vis', defaults={'song_id': 0})
@app.route('/vis/<int:song_id>')
def songvis(song_id):
    return flask.render_template('analysis.html', song_id=song_id)


def retrieve_data(song_id=None):

    try:
        with open(app.config['data'] + os.path.sep + '%06d.json' % int(song_id), 'r') as f:
            D = json.load(f)
    except IOError:
        D = {}
    return D


@app.route('/songs', defaults={'start': 0, 'limit': 10})
@app.route('/songs/<int:start>', defaults={'limit': 10})
@app.route('/songs/<int:start>/<int:limit>')
def songs(start, limit):

    n       = len(app.index)
    limit   = max(0, min(20, limit))
    start   = min(n-1, max(0, start))
    keys    = sorted(app.index.keys())[start:start+limit]

    results = []
    for k in keys:
        results.append( {'key': k, 'meta': app.index[k]['meta'] } )

    r = {'num_songs': n, 'start': start, 'end': start + limit}
    return json.encode({'range': r, 'songs': results})
    

@app.route('/data/<int:song_id>')
def data(song_id):

    D = retrieve_data(song_id)
    D['filename'] = os.path.basename(D['filename'])
    return json.encode(D)

@app.route('/audio/<int:song_id>')
def audio(song_id):
    
    # get the song info
    song_file = retrieve_data(song_id)['filename']

    return flask.send_file(song_file, cache_timeout=0)

@app.route('/')
def index():
    '''Top-level web page'''

    return flask.render_template('index.html')

# Main block
if __name__ == '__main__':
    if len(sys.argv) > 1:
        CFG = loadConfig(sys.argv[1])
    else:
        CFG = loadConfig('server.ini')

    port = 5000
    if os.environ.get('ENV') == 'production':
        port = 80

    run(host='0.0.0.0', port=port, debug=DEBUG)

