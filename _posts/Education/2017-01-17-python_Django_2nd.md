---

category : Education

title: Python_Django 첫번째 프로젝트 시작하기_2nd  

layout: post

---

[Python_Django 첫번째 프로젝트 시작하기_1st](https://pminsu01.github.io/2017-python_Django/ "첫번째 프로젝트")  

에서 Django 설치까지는 완료하였다.  

간단한 블로그 제작을 통해 Django 프로젝트를 시작해본다. 장고의 기본 구성을 할 것이다. 그 파일을 다른곳으로 옮기면 안되고   
특정한 구조를 유지해야 한다고 한다.  
첫번째로 가상환경이 설치 되어 있는 디렉토리로 이동한다. 나 같은 경우에는 Dropbox에 설정하였으므로  

```
Dropbox/Study/Python
```

으로 이동한다.

```
django-admin startproject mysite .

```


명령어 창에 입력한다. django-admin으로 mysite라는 이름으로 프로젝트 시작(?) 명령어 끝에 마침표 반드시 붙여야한다.  
공부하면서 보는 블로그 설명에 따르면  
점 . 은 디렉토리에 장고를 설치하라고 스크립트에 알려주기 때문에 중요하다고한다.(?)  
설치된 디렉토리 형식은  

  Python  
  ㄴ db.sqlite3  
  ㄴ manage.py  
  ㄴ mysite  
        ㄴ__init__.py    
        ㄴsetting.py   
        ㄴurl.py  
        ㄴwsgi.py  
  로 구성되어 있다.  


## 구성 정보

  1. manage.py  
      사이트 관리를 도와주는 역할을 한다. 이 스크립트로 다른 작업 없이 컴퓨터에 웹 서버를 시작할 수 있다.

  2. setting.py  
      웹사이트 설정 스크립트

  3. db.sqlite3  
      사이트 내의 데이터를 저장하기 위한 DB




## 설정해야 할것

 1. setting.py에 가서  
    Time_ZONE = 'Asia/seoul'

 2. 정적파일 경로 추가  
    STATIC_ROOT = os.path.join(BASE_DIR, 'static')   => 아직 이해 불가


 3. db.sqlite3  

    ```
    DATABASES = {    
        'default': {      
            'ENGINE': 'django.db.backends.sqlite3',      
            'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),      
        }    
    }    
     ```


설정 완료

 ```
python manage.py migrate
```

 설정을 마친 다음에 명령어 입력  
 ㅡ

```
Operations to perform:
  Synchronize unmigrated apps: staticfiles, messages
  Apply all migrations: admin, contenttypes, auth, sessions
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
  Installing custom SQL...
Running migrations:
  No migrations to apply.

```

적용 완료 및 구성을 완료한다  

```

python manage.py runserver

```

명령어 입력시  

```
Performing system checks...

System check identified no issues (0 silenced).
January 18, 2017 - 00:58:07
Django version 1.8, using settings 'mysite.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.

```

로컬 ip로 8000번 포트로 서버가 실행된다.  

![1.image](/images/python/1.png "1")


완성
