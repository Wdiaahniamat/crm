import requests

url = "https://hkzrvzctnhgznnocxovh.supabase.co/storage/v1/object/crm-uploads/test.txt"
headers = {
    "Authorization": "Bearer sb_publishable_0VJ-an-3dlkzPV7d40iWiw_xX8tr6Cu",
    "apikey": "sb_publishable_0VJ-an-3dlkzPV7d40iWiw_xX8tr6Cu"
}

try:
    response = requests.post(url, headers=headers, files={"file": ("test.txt", b"Hello")})
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
