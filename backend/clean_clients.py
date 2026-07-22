import sys, sqlite3, json
conn = sqlite3.connect('data/crm.db')
c = conn.cursor()
c.execute("SELECT vaultFiles, reportFiles FROM clients")
rows = c.fetchall()
for rowid, row in enumerate(rows):
    modified = False
    vault = []
    if row[0]:
        vault = json.loads(row[0])
        for doc in vault:
            if 'fileData' in doc:
                del doc['fileData']
                modified = True
    report = []
    if row[1]:
        report = json.loads(row[1])
        for doc in report:
            if 'fileData' in doc:
                del doc['fileData']
                modified = True
    if modified:
        c.execute("UPDATE clients SET vaultFiles = ?, reportFiles = ? WHERE rowid = ?", (json.dumps(vault), json.dumps(report), rowid+1))
        print(f'Cleaned client {rowid+1}')
conn.commit()
print('Done cleaning clients.')
