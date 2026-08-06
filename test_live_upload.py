import requests

url = "https://crm.xebright.tech/api/upload"
files = {'file': ('test.txt', b'Hello world', 'text/plain')}
try:
    response = requests.post(url, files=files, allow_redirects=False)
    print("Status Code:", response.status_code)
    print("Headers:", response.headers)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
