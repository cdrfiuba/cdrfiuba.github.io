# cdrfiuba.github.io
La página web del Club de Robótica, publicada en [clubderobotica.com.ar](http://clubderobotica.com.ar).

## Instalación para desarrollo local

* Instalar [Ruby 2.1.0+](https://www.ruby-lang.org/en/downloads/), y [Git](https://git-scm.com/), y ejecutar:
```
git bash
gem install bundler
cd {repositorio cdrfiuba.github.io}
bundle install
bundle exec jekyll serve
```

Los cambios se reflejan automáticamente en la carpeta `/_site` (que está ignorada en el repo).

Más información en [Setting Up Your Github pages locally with Jekyll](https://help.github.com/articles/setting-up-your-github-pages-site-locally-with-jekyll/).



## Cómo instalar Jekyll manualmente en Linux

(sacado de [acá](https://www.garron.me/en/bits/latest-jekyll-ubuntu.html))

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

### Instalando en Ubuntu 15.10

En Ubuntu 15.10 tenemos ruby moderno, por lo que no necesitamos rvm.

* Instalamos ruby:
```
$ sudo apt-get install ruby ruby-dev
```
* Instalamos jekyll:
```
$ sudo gem install jekyll
```

### Usando Jekyll

* Siempre, **antes** de usar jekyll:
```bash
$ source ~/.rvm/scripts/rvm
```
