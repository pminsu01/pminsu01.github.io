---

title : JDBC 활용하여 Oracle 연결 하기

category: Setting

layout : post

---

```
<%@ page language="java" contentType="text/html; charset=EUC-KR"
    pageEncoding="EUC-KR"%>
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
	 out.println("successs intall");
	 conn =DriverManager.getConnection("jdbc:oracle:thin:@localhost:1521:blog", "pminsu01" , "qnddj5418");
	 out.println("connect success");
	 stmt =conn.createStatement();
	 rs = stmt.executeQuery("select *from info");

	 if( rs!= null) {

		 out.println("이름 :" +rs.getString("name"));
		 out.println("주민등록번호 : " + rs.getInt("pri_number"));
		 out.println("성별 : " + rs.getString("sex"));
		 out.println("전화번호 : " + rs.getString("phone_num"));
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
