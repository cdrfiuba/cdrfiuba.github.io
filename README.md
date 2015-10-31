# cdrfiuba.github.io
La página web del club

## Como instalar Jekyll

(sacado de [aca](https://www.garron.me/en/bits/latest-jekyll-ubuntu.html))

* Agregamos la clave para poder verificar rvm
```bash
$ gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3
```
* Instalamos rvm
```bash
$ \curl -L https://get.rvm.io | bash -s stable
```
* Instalamos las depedencias de rvm
```bash
$ rvm requirements
```
* Instalamos un ruby moderno
```bash
$ rvm install ruby
```
* Ponemos que queremos usar el ruby moderno por omisión
```bash
$ rvm use ruby --default
$ rvm rubygems current
```
* Instalamos Jekyll
```bash
$ sudo su
$ source .rvm/scripts/rvm
$ gem install jekyll --no-rdoc --no-ri
```

