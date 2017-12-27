import sys, os, requests
email = sys.argv[1]
result = requests.get(os.environ.get('AIRFLOWAPI')+'/getcode/'+email)
print result.text
