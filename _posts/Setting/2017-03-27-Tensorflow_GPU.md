---
title: Tensorflow GPU Install

category : Setting

layout : post

---


### 1. NVIDIA Graphic Card Driver Install   

### 2. NVDIA-CUDA-toolkit Install

```
sudo apt-get install nvidia-cuda-toolkit

```


### 3. Tensorflow GPU Version Install

```
# Ubuntu/Linux 64-bit, CPU 전용, Python 2.7
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/linux/cpu/tensorflow-0.9.0-cp27-none-linux_x86_64.whl

# Ubuntu/Linux 64-bit, GPU 버전, Python 2.7
# CUDA toolkit 7.5 와 CuDNN v4 필수. 다른 버전을 사용하려면 아래 "소스에서 설치" 섹션을 참고하세요.
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/linux/gpu/tensorflow-0.9.0-cp27-none-linux_x86_64.whl

# Mac OS X, CPU 전용, Python 2.7
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/mac/tensorflow-0.9.0-py2-none-any.whl

# Ubuntu/Linux 64-bit, CPU 전용, Python 3.4
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/linux/cpu/tensorflow-0.9.0-cp34-cp34m-linux_x86_64.whl

# Ubuntu/Linux 64-bit, GPU 버전, Python 3.4
# CUDA toolkit 7.5 와 CuDNN v4 필수. 다른 버전을 사용하려면 아래 "소스에서 설치" 섹션을 참고하세요.
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/linux/gpu/tensorflow-0.9.0-cp34-cp34m-linux_x86_64.whl

# Ubuntu/Linux 64-bit, CPU 전용, Python 3.5
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/linux/cpu/tensorflow-0.9.0-cp35-cp35m-linux_x86_64.whl

# Ubuntu/Linux 64-bit, GPU 버전, Python 3.5
# CUDA toolkit 7.5 와 CuDNN v4 필수. 다른 버전을 사용하려면 아래 "소스에서 설치" 섹션을 참고하세요.
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/linux/gpu/tensorflow-0.9.0-cp35-cp35m-linux_x86_64.whl

# Mac OS X, CPU 전용, Python 3.4 or 3.5:
$ export TF_BINARY_URL=https://storage.googleapis.com/tensorflow/mac/tensorflow-0.9.0-py3-none-any.whl
```

설정 한 후  

```
# Python 3
$ sudo pip3 install --upgrade $TF_BINARY_URL

```


P.S  Konlpy 설치 할 때 JPype1 install 문제 해결

```
sudo pip3 install JPype1
```
