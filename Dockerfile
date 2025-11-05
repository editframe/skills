FROM node:24-slim

# RUN npx playwright@1.53.0 install --with-deps chrome

# Add unstable repo for ffmpeg but keep it at lowest priority
# RUN echo "deb http://deb.debian.org/debian unstable main" > /etc/apt/sources.list.d/unstable.list && \
#   echo 'Package: *\nPin: release a=unstable\nPin-Priority: 100' > /etc/apt/preferences.d/unstable

# Install ffmpeg from unstable, other packages from stable
RUN apt-get -y update && \
  apt-get install -y ffmpeg && \
  apt-get install -y --fix-missing \
  zsh \
  git \
  jq \
  && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

WORKDIR /packages
COPY ./package.json ./package-lock.json /

