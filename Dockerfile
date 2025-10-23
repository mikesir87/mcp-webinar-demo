###########################################################
# Stage: base
#
# This stage serves as the base for all of the other stages.
# By using this stage, it provides a consistent base for both
# the dev and prod versions of the image.
###########################################################
FROM node:18 AS base

# Setup a non-root user to run the app
WORKDIR /usr/local/app
RUN useradd -m appuser && chown -R appuser /usr/local/app
USER appuser
COPY --chown=appuser:appuser package.json package-lock.json ./


###########################################################
# Stage: dev
#
# This stage is used to run the application in a development
# environment. It installs all app dependencies and will
# start the app in a mode that will watch for file changes
# and automatically restart the app.
###########################################################
FROM base AS dev
ENV NODE_ENV development
RUN npm install
CMD ["yarn", "dev-container"]


###########################################################
# Stage: final
#
# This stage serves as the final image for production. It
# installs only the production dependencies.
###########################################################
FROM base AS final
ENV NODE_ENV production
RUN npm ci --production --ignore-scripts && npm cache clean --force
COPY ./src ./src

EXPOSE 3000

CMD [ "node", "src/index.js" ]