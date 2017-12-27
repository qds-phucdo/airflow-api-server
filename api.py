# coding=utf-8
"""Main Module for the Hub"""

# Hub Methods
from __future__ import division
import logging
from functools import wraps
from datetime import datetime, date, timedelta
import hmac
import hashlib
import time
import os
import urlparse
import sys
import redis
import requests
import subprocess
from os import path
sys.path.append(os.getcwd())
from flask import (Flask, g, json, session,
                   redirect, render_template, request,
                   url_for, Response, jsonify)
from src.py.pg import PGWriter
import subprocess, threading
import calendar

PG = PGWriter()
# Sys
reload(sys)
sys.setdefaultencoding('utf8')

app = Flask(__name__)
process_casperjs = None
output_casperjs = None
@app.before_request
def before_request():
    """For base anonymous users"""

    passthrough_conditions = [
        request.is_secure,
        request.headers.get('X-Forwarded-Proto', 'http') == 'https',
        'localhost' in request.url,
        '104.238.133.161' in request.url, #QDS's server
        '107.191.56.35' in request.url, #QDS's server
        '0.0.0.0' in request.url
    ]

    # Always use SSL, just not on dev
    if not any(passthrough_conditions):
        if request.url.startswith('http://'):
            url = request.url.replace('http://', 'https://', 1)
            code = 301
            return redirect(url, code=code)

@app.route('/')
def index():
    return "Ok, working"

def target(args_command):
    global process_casperjs
    global output_casperjs
    print 'Thread started'
    #Call nodejs shell script
    cmd = "./node_modules/casperjs/bin/casperjs casperjs3.js arg1 "
    process_casperjs = subprocess.Popen(cmd + str(args_command), stdout=subprocess.PIPE,\
                        shell=True)

    output_casperjs = process_casperjs.communicate()[0]

    print 'Thread finished'
    print output_casperjs

@app.route('/integrate_amazon_associates', methods=['POST'])
def integrate_amazon_associates():
    global output_casperjs
    payload = {
        'email': request.form['email'],
        'password': request.form['password'],
        'connection_name': request.form['connection_name'],
        'provider_slug': request.form['provider_slug'],
        'user_id': request.form['user_id']
    }

    result = PG.set_connection_amazon_associates(payload)
    print "=====result====="
    print result
    print "=====result====="
    args_command = '--email='+request.form['email']+\
            ' --password="'+request.form['password']+'"'

    if result is not None:
        thread = threading.Thread(target=target, args=(args_command,))
        thread.start()

        thread.join(20)
        if thread.is_alive():
            print 'Terminating process'
            process_casperjs.terminate()
            # thread.join()
        if process_casperjs.returncode is None:
            output_casperjs = 2

        print "return code "+ str(process_casperjs.returncode)
        print "output_casperjs "+str(output_casperjs)

    return json.dumps({'output': str(output_casperjs)})

@app.route('/getreport/<email>')
def getreport(email="andrew@gmail.com"):
    params = {
        'email' : email
    }
    result = PG.get_connection_amazon_associates(params)

    if result is not None:
        cmd = './node_modules/casperjs/bin/casperjs casperjs_getreport.js arg1 --email="'+result['email']+'"'\
                ' --password="'+result['password']+'"'
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE,\
                            shell=True)
        output = p.communicate()[0]
        output = output.strip()
        print output
        return json.dumps({'output':output})
    else:
        return None

@app.route('/getcode/<email>')
def getcode(email="andrew@gmail.com"):
    params = {
        'email' : email
    }
    result = PG.get_connection_amazon_associates(params)
    print "get code"
    print result
    print "=---------="
    sys.stdout.flush()
    if result is None or result['security_code'] is None:
        result = 'null'
    else:
        result = str(result['security_code'])

    return result

@app.route('/update_code', methods=['POST'])
def update_code():
    params = {
        'email': request.form['email'],
        'security_code': request.form['security_code']
    }
    result = PG.update_security_code(params)
    return "OK"

if __name__ == '__main__':
    app.run(debug=True)
