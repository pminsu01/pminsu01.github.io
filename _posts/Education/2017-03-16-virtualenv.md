---
category : Education

title: 가상화 Python 환경 Virtualenv 설정하기

layout: post

---

Virtualenv 설치하기

```

sudo apt-get install python-pip python-dev python-virtualenv

```



```
$ Virtualenv --system-site-packages ~/tensorflow

```

tensorflow라는 디렉토리에 Virtualenv 만들기

```
$ source ~/tensorflow/bin/activate      #bash를 이용한다
$ source ~/tensorflow/bin/activate.csh  #csh를 이용한다


```
