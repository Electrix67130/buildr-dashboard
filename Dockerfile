FROM node:24-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]

FROM base AS production
# Les variables NEXT_PUBLIC_* sont inlinees dans le bundle au moment du build :
# elles doivent donc etre fournies ici, pas seulement au runtime.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY
# Toutes les dependances : le build Next a besoin des devDeps (tailwind,
# typescript). Elles ne servent qu'au build, pas au runtime.
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]