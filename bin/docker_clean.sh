#!/bin/bash

PROJECT_NAME=omnyistproductions

docker container stop $(docker ps -a -q --filter name="${PROJECT_NAME}") &>/dev/null

docker container rm $(docker ps -a -q --filter name="${PROJECT_NAME}") &>/dev/null

docker rmi $(docker images -q "${PROJECT_NAME}*") &>/dev/null

exit 0
