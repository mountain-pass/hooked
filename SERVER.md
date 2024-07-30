
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

# 19 JULY

- [ ] Abilty to provide templates that resolve to ${TEMPLATE_NAME}
  docker:
    $template: ['ftp', 'web', 'cs2']
    $template:
      $cmd: docker ps -a --format "{{.Names}}"
- [ ] Healthchecks - run on a cron schedule -> notify when down?
 triggers:
   cs2_isRunning:
     $cron:
     $job: 
   cs2:
     isRunning:
       $health: 0 0 1 * * * 
       $cmd: docker ps --filter "name=cs2" --format "{{.Names}}" | grep -q "cs2"

- [ ] Environment dashboard - how do i know what's where?
- [ ] Reporting and data - allow people to run jobs

# NICE TO HAVE
- [ ] Server - Clean up .tmp files
- [x] Package UI with the NPM release
- [ ] Document triggers
- [ ] Rate limit to stop brute force API-KEY
- [x] Validate YAML config
- [ ] Permanently enable NPM / Makefile / Icons - Remove config options & Ethers?
- [x] Support javascript? No -> Just use node docker container
- [ ] Reduce bundle size - https://bundlephobia.com/package/@mountainpass/hooked-cli
- [x] Fix security alerts
- [ ] UI Ability to manage non-transient jobs (see inflight jobs, see job results, see job logs, cancel jobs)
- [ ] Ability to run commands in already running docker containers?
- [ ] Document SSL usage
- [ ] UI - Ability to view logs, and rerun jobs
- [ ] UI - Ability to flag scripts as interactive (e.g. polling log) - And don't allow through web interfae
- [ ] UI - Ability to edit/organise jobs via web
- [ ] UI - Ability to delegate jobs to other servers
- [ ] UI - Ability to set max runtime on scripts
- [ ] Handle file inputs/outputs? -> Expose directory
- [ ] Keep historical logs (incl pass/fail)
- [ ] User roles / Dashboard - Expose functions to groups of users
- [ ] Support $jobs_parallel
