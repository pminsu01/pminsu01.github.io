---

title : JDBC 활용하여 Oracle DB와 연결 하기

category: Education

layout : post

---

```
<%@ page language="java" contentType="text/html; charset=EUC-KR"
    pageEncoding="utf-8"%>
    <%@ page import="java.sql.*, java.util.*" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=EUC-KR">
<title>Insert title here</title>
</head>
<body>

 <%

 Connection conn =null;
 Statement stmt = null;
 ResultSet rs =null;

 try {

	 Class.forName("oracle.jdbc.driver.OracleDriver");
	 conn =DriverManager.getConnection("jdbc:oracle:thin:@localhost:1521:pminsu2", "pminsu01" , "qnddj5418");	// 데이터베이스 연결
	 stmt =conn.createStatement();
	 rs = stmt.executeQuery("select *from info");

	// 노트북에서 연결 완료 확인
	 while(rs.next()) {


		 out.println("이름 :" +rs.getString("name"));
		 out.println("주민등록번호 : " + rs.getInt("birth"));
		 out.println("전화번호" + rs.getString("phone"));
		 out.println("사는 곳: " + rs.getString("location"));




	 }
 }

 catch(Exception e) {

	 e.printStackTrace();
	 out.println("fail");
 }


 finally {

	 if(null != stmt) stmt.close();
	 if(null != rs)rs.close();
	 if(null != conn)conn.close();
 }

 %>
</body>
</html>
```
