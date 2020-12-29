# cfw-durable-8char-bug

Strange bug with cloudflare durable objects using 8 character keys.

Get a new namespace:

```console
curl https://${WORKER_SUBDOMAIN}.workers.dev/_id
```

```json
{
  "id": "df4382e12625e66f1d93e2a243d121b6052a27cf154f989288083804037b4b72"
}
```

Write a value:

```console
curl --request POST \
    'https://${WORKER_SUBDOMAIN}.workers.dev?id=df4382e12625e66f1d93e2a243d121b6052a27cf154f989288083804037b4b72'
```

```json
{
  "key": "1d467665",
  "value": "c24464150383e90142628ebece0e93757b4a4c42b3b91597e4426c04"
}
```

Read the values:

```console
curl 'https://${WORKER_SUBDOMAIN}.workers.dev?id=df4382e12625e66f1d93e2a243d121b6052a27cf154f989288083804037b4b72'
```

Expected:

```json
{
  "values": [
    ["1d467665", "c24464150383e90142628ebece0e93757b4a4c42b3b91597e4426c04"]
  ]
}
```

Actual:

```json
{
  "values": [
    [
      "1d467665\"8c24464150383e90142628ebece0e93757b4a4c42b3b91597e4426c04",
      "c24464150383e90142628ebece0e93757b4a4c42b3b91597e4426c04"
    ]
  ]
}
```
