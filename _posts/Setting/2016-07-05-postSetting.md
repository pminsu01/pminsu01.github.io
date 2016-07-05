---
title: 블로그 포스트 세팅 할 것

layout: post

category: Setting

---

Oracle DB Table Setting

create table blog (
 2  post_num int,
 3  category varchar2(10),
 4  title varchar2(50),
 5  post clob,      // 단일 바이트 가변 길이 문자열 (1~4Gbyte)
 6  days date,      // 날짜 저장
 7  constraint pk_post primary key(post_num)
 8  );
