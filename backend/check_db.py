import sys, sqlite3, json
conn = sqlite3.connect('data/crm.db')
c = conn.cursor()
c.execute("SELECT documents FROM users WHERE username='admin'")
row = c.fetchone()
if row and row[0]:
    docs = json.loads(row[0])
    print(len(docs), 'documents found')
    for d in docs:
        print(d.keys())
        if 'data' in d:
            print('data length:', len(d['data']))
