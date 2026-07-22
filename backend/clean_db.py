import sys, sqlite3, json
conn = sqlite3.connect('data/crm.db')
c = conn.cursor()
c.execute("SELECT documents FROM users")
rows = c.fetchall()
for rowid, row in enumerate(rows):
    if row and row[0]:
        docs = json.loads(row[0])
        modified = False
        for doc in docs:
            if 'fileData' in doc:
                del doc['fileData']
                modified = True
        if modified:
            new_docs = json.dumps(docs)
            c.execute("UPDATE users SET documents = ? WHERE rowid = ?", (new_docs, rowid+1))
            print(f'Cleaned user {rowid+1}')
conn.commit()
print('Done cleaning db.')
