# ABI Plugin <!-- omit in toc -->

[Back to Index](README.md)

- [Overview](#overview)
- [Configuration \> Environment Variables (Required)](#configuration--environment-variables-required)

# Overview

The ABI Plugin will scan child directories for JSON files that contain an `abi` and an `address`.

These ABI definitions will then be presented under an `_abi_` menu option, that will allow the user to invoke the contract's various functions.

It will scan up to a maximum of five child directories deep.

# Configuration > Environment Variables (Required)

- `PROVIDER_URL` - (`string`) the JSON RPC endpoint to connect to.
- `PRIVATE_KEY` - (`string` - optional) the private key of the wallet to load.
- `BLOCK_NUMBER` - (`string` - optional) the [block tag](https://docs.ethers.org/v5/api/providers/types/#providers-BlockTag) at which to execute the function.

**Example:**

```yaml
plugins:
    abi: true

env:
    default:
        PROVIDER_URL: https://api.avax.network/ext/bc/C/rpc
        PRIVATE_KEY: abcdefg
        BLOCK_NUMBER: 123456
```
