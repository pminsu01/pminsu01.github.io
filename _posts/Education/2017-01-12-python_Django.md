---
category : Education

title: Python_Django 첫번째 프로젝트 시작하기

layout: post

---

익숙하지 않은 linux-ubuntu에서
Python을 공부하기 위해 그리고 학교 졸업 프로젝트 서버 생성을 위해 Django 프로젝트를 시작해본다.

일단 가상환경(Virtualenv)을 생성한다.
가상환경을 설정하는 이유는 자세히 모르겠다
일단 디렉토리 안에 (일단 나는 노트북과 연동하고자 dropbox안에 디렉토리를 설정했다.)

```
python3 -m venv myvenv

```

python3의 myvenv라는 가상환경을 만든다. myvenv는 내 마음대로 설정한다.
중간에 설치 되지 않았다는 오류가 뜨긴 하는데

```
sudo apt-get install python-virtualenv
```

명령어를 입력하여 해결한다.
설치가 완료 되었다면

```
source myvenv/bin/activate

```
명령어를 입력하여 가상환경을 실행시킨다. myvenv의 bin의 activate 실행한다.

```
(myvenv) ~ $

```
라고 콘솔창에 뜨는 것을 확인하면 가상환경 실행이 되는 것이다

### 장고 설치하기

Virtualenv이 설치 되었으니 pip를 이용하여 Django를 설치한다.

```
pip install Django==1.8

```
을 입력한다

pip가 설치 되지 않을경우에는

```
sudo apt-get install python-pip

```

을 이용하여 설치한다. 그런다음 Django 설치 명령어를 입력한다.

```
(myvenv) mspark@ubuntu:~/Dropbox/Study/Python$ pip install django==1.8
Collecting django==1.8
  Using cached Django-1.8-py2.py3-none-any.whl
Installing collected packages: django
Successfully installed django-1.8.7
You are using pip version 8.1.1, however version 9.0.1 is available.
You should consider upgrading via the 'pip install --upgrade pip' command.

```

설치 완료 메시지
