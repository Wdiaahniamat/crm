import sys, sqlite3, bcrypt
conn = sqlite3.connect('data/crm.db')
c = conn.cursor()
new_pass = 'admin123'
hashed = bcrypt.hashpw(new_pass.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
c.execute("UPDATE users SET passwordHash = ? WHERE username='admin'", (hashed,))
conn.commit()
print('Password for admin reset to admin123')
