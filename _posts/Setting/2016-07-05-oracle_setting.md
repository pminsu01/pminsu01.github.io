---
title : Oracle 계정 Setting
category: Setting
layout: post

---

Oracle 관리자 접속

CMD창 열고


```
sqlplus /nolog
```

입력하게 되면
sql에서 접속된다.

```
conn /as sysdba
```

관리자 권한으로 접속

사용자 계정 생성시의 쿼리

```
create user 아이디 identified by 비밀번호
```

권한 부여 하기


접근 권한 부여
DB접근 권한 부여
일반적 권한 부여
최고 권한 부여


```
grant connect to 아이디
grant create session to 아이디
grant resoutce to 아이디
grant dba to 아이디

```
