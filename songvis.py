#!/usr/bin/env python

import flask
import ConfigParser
import sys
import os
import ujson as json

DEBUG = True
SECRET_KEY = 'yodawg'

HMM = None

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


def run(**kwargs):
    app.run(**kwargs)

@app.route('/health-check', methods=['GET'])
def healthcheck():
    return {'status': 'OK'}


@app.route('/')
def index():
    '''Top-level web page'''

    return flask.render_template('index.html')

# Main block
if __name__ == '__main__':
    CFG = loadConfig(sys.argv[1])

    port = 5000
    if os.environ.get('ENV') == 'production':
        port = 80

    run(host='0.0.0.0', port=port)

