
# Server Configuration

e.g.
friends - start server
workers - deploy / view logs

## TODO

- [x] Ability to see env/scripts/imports/plugins from API
- [x] Ability to run jobs via api
- [x] Ability to post stdin when running a job
- [x] Ability to reload hooked.yaml on modification date change
- [x] Ability to set --ssl , --sslCert , --sslKey
- [x] Ability to set --api-key
- [x] Example ssh cert in example config
- [x] Dockerise - but how will it interact with Docker / SSH?
- [x] Ability to cron schedule jobs and specify timezone
- [x] UI - Ability to execute scripts

# NICE TO HAVE
- [ ] Server - Clean up .tmp files
- [ ] Package UI with the NPM release
- [ ] Document triggers
- [ ] Rate limit to stop brute force API-KEY
- [ ] Validate YAML config
- [ ] Permanently enable NPM / Makefile / Icons - Remove Ethers/?
- [ ] Support javascript? Just use node docker container
- [ ] Reduce bundle size - https://bundlephobia.com/package/@mountainpass/hooked-cli
- [ ] Fix security alerts
- [ ] Ability to manage non-transient jobs (see inflight jobs, see job results, see job logs, cancel jobs)
- [ ] Ability to run commands in already running docker containers?
- [ ] Document SSL usage
- [ ] UI - Ability to view logs, and rerun jobs
- [ ] UI - Ability to flag scripts as interactive (e.g. polling log) - And don't allow through web interfae
- [ ] UI - Ability to edit/organise jobs via web
- [ ] UI - Ability to delegate jobs to other servers
- [ ] UI - Ability to set max runtime on scripts
- [ ] Handle file inputs/outputs?
- [ ] Keep historical logs (incl pass/fail)
- [ ] User roles - Expose functions to groups of users
- [ ] Support $jobs_parallel
