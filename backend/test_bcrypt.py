import bcrypt

hash = b"$2b$10$LCX8rAM/Iu3O20H9GrrODes5/.a/jMBCqIMH4wquSfpP1wH2kqRQK"
print(bcrypt.checkpw(b"admin", hash))
print(bcrypt.checkpw(b"password", hash))
print(bcrypt.checkpw(b"123456", hash))
