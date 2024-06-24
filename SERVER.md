
# Server Configuration

e.g.
friends - start server
workers - deploy / view logs

## TODO

- [x] Ability to see env/scripts/imports/plugins from API
- [x] Ability to run jobs via api
- [x] Ability to post stdin when running a job
- [x] Ability to reload hooked.yaml on modification date change
- [x] Ability to set --ssl , --ssl-cert , --ssl-key
- [x] Ability to set --api-key
- [x] Example ssh cert in example config
- [x] Dockerise - but how will it interact with Docker / SSH?

# NICE TO HAVE
- [ ] Ability to cron schedule jobs and specify timezone (see inflight jobs, see job results, see job logs, cancel jobs)
- [ ] Ability to run commands in already running docker containers
- [ ] Document SSL usage
- [ ] Perform all actions through web ui (& mobile compatible)
- [ ] Ability to view logs, and rerun jobs
- [ ] Ability to flag scripts as interactive (e.g. polling log) - And don't allow through web interfae
- [ ] Ability to edit/organise jobs via web
- [ ] Ability to delegate jobs to other servers
- [ ] Ability to set max runtime on scripts
- [ ] Handle file inputs/outputs?
- [ ] Keep historical logs (incl pass/fail)
- [ ] User roles - Expose functions to groups of users
