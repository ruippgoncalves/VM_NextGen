# VM Next Gen

Com o passar do tempo, as aplicações vão ficando desatualizadas.
Neste caso, foi o que aconteceu. 
A App original também foi desenvolvida de uma forma monolítica e havia necessidade de a modularizar para facilitar a sua manutenção evolutiva.

Este repositório é e continuará a ser público.
Quem quiser pode usar esta plataforma à vontade (uma referência à fonte é sempre eticamente louvável).

---

## Instalação

O processo de instalação é extremamente simples bastando clonar o repositório e correr o orquestrador:

```sh
$ git clone https://github.com/jcramalho/VM_NextGen.git
$ cd VM_NextGen
$ docker compose up --build -d
```
Nota: se a versão do docker instalada for anterior à 25 será necessário usar `docker-compose`.
