---
title : 크린토피아 홍보 웹사이즈 개발 프로젝트 02
layout: post
category: Project
subtitle: Navigation 바 및 Footer 만들기
---

언제 끝날지 모르는 홈페이지 제작기 두번째이다.
문득 코드 이것저것 작업하다가 (아직 개발이라고 하기에도 뭐하기 때문에..)

음.. 사용자들 아니 고객들이 검색하는 곳은 모바일 일 것이고 그렇다면 모바일에도 반응하는 반응형 웹으로 제작해야 하지 않을까 라는 생각이 들게 되었다.
그래서 예전부터 반응형 웹을 지원하는 [BootStrap](http://bootstrapk.com/)을 한번 써보기로 했다.
첫번째 블로그 글 처럼 참고하는 크린토피아 페이지나 롯데리조트 홈페이지 그리고 모든 홈페이지를 보면 네비게이션 바가 만들어져 있다.

![]({{site.url}}/images/CleanTopiaPJ/navigationBar.JPG)

처럼 되어 있다.

그렇기 때문에 부트스트랩에 있는 Navigation 바를 만들기 위해 예제 코드를 참고하였다.

[BootStrap 네비게이션 바 예제](http://bootstrapk.com/examples/navbar-static-top/)
![]({{site.url}}/images/cleantopia/BootStrapNavigationBar.JPG)

```
<nav class="navbar navbar-default navbar-static-top">
      <div class="container">
        <div class="navbar-header">
          <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <a class="navbar-brand" href="#">Project name</a>
        </div>
        <div id="navbar" class="navbar-collapse collapse">
          <ul class="nav navbar-nav">
            <li class="active"><a href="#">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Dropdown <span class="caret"></span></a>
              <ul class="dropdown-menu" role="menu">
                <li><a href="#">Action</a></li>
                <li><a href="#">Another action</a></li>
                <li><a href="#">Something else here</a></li>
                <li class="divider"></li>
                <li class="dropdown-header">Nav header</li>
                <li><a href="#">Separated link</a></li>
                <li><a href="#">One more separated link</a></li>
              </ul>
            </li>
          </ul>
          <ul class="nav navbar-nav navbar-right"><li><a href="../navbar/">Default</a></li><li class="active"><a href="./">Static top <span class="sr-only">(current)</span></a></li><li><a href="../navbar-fixed-top/">Fixed top</a></li></ul>
        </div><!--/.nav-collapse -->
      </div>
    </nav>
```

해당 코드를 복붙하기 보다 직접 타이핑해보며 Class, ID 그리고 그에 따르는 CSS 파일까지 모두 공부해가며 작성하였다.<br/>
<span style="color:red"> *하지만* </span> <br/> 자꾸 버튼이 만들어져서 버튼을 누르게 되면 네비게이션 메뉴(Home about Contact, Dropdown)  이 나오게 되고 누르지 않으면 표시가 되지 않았다.
이것으로 한 2시간 정도 머리 싸맸는데.. <br/> 답은 허무하게 저 코드는 BootStrap3을 기준으로 작성된 것이라 ID, Class가 모두 다르다고 검색해보니 [명월 일지](https://nowonbun.tistory.com/532) 블로그 글에 나와있었다.
그래서 저 블로그 코드를 참고하여 네비게이션 바를 표시할 수 있었다.
![]({{site.url}}/images/CleanTopiaPJ/CleanTestNavigationBar.JPG)

---
<br/>
그리고 두번째 Footer 만들기 <br/>
홈페이지 밑에 보면 보통 사업자에 대한 내용과 간단한 CopyRights 관련 글이 있는 것을 볼 수 있다.
마치 ![]({{site.url}}/images/CleanTopiaPJ/KaKaoFooter.JPG)   <br/>
이것 처럼..
그래서 이것도 BootStrap에 있는 예시를 가져와서 작성하였다.  <br/>
![]({{site.url}}/images/CleanTopiaPJ/CleanTestFooter.JPG)

이렇게 위에 NavigationBar.JSP와 Footer.JSP를 만들어 각 페이지마다 Include 시킬 수 있도록 하였다.
다음 시간에는 네비게이션바를 조금 정리하고 (복사 붙여넣기 했으니 이제 나만의 것으로 수정할 차례..)    Home 화면에 Swipe를 할 수 있겠끔 할 것이다.

예를 들어
![]({{site.url}}/images/CleanTopiaPJ/BootStrapSwipe.JPG)<br/>   이런식으로 진행 할 예정이다.
