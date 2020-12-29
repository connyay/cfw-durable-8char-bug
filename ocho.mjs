export default {
  async fetch(request, env) {
    return await handleErrors(request, async () => {
      const url = new URL(request.url);
      if (url.pathname === "/_id") {
        const id = env.ocho.newUniqueId().toString();
        return new Response(JSON.stringify({ id }), {
          headers: { "Content-Type": "application/json; charset=UTF-8" },
        });
      }
      return getOchoStub(env, request).fetch(url, request);
    });
  },
};

// `handleErrors()` is a little utility function that can wrap an HTTP request handler in a
// try/catch and return errors to the client. You probably wouldn't want to use this in production
// code but it is convenient when debugging and iterating.
async function handleErrors(request, func) {
  try {
    return await func();
  } catch (err) {
    if (request.headers.get("Upgrade") == "websocket") {
      // Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
      // won't show us the response body! So... let's send a WebSocket response with an error
      // frame instead.
      let pair = new WebSocketPair();
      pair[1].accept();
      pair[1].send(JSON.stringify({ error: err.stack }));
      pair[1].close(1011, "Uncaught exception during session setup");
      return new Response(null, { status: 101, webSocket: pair[0] });
    } else {
      const { code = 500 } = err;
      return new Response(err.stack, { status: code });
    }
  }
}

function getOchoStub(env, request) {
  const url = new URL(request.url);
  const id = request.headers.get("x-ocho-id") || url.searchParams.get("id");
  if (!id) {
    return env.ocho.get(env.ocho.idFromName("demo"));
  }
  if (!id.match(/^[0-9a-f]{64}$/)) {
    throw new RequestError(400, `Malformed "x-ocho-id" header`);
  }
  return env.ocho.get(env.ocho.idFromString(id));
}

export class Ocho {
  constructor(state, env) {
    this.storage = state.storage;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const options = this._listOptions(url);
    if (request.method === "GET") {
      const values = await this.storage.list(options);
      return new Response(JSON.stringify({ values: [...values] }, null, 2), {
        headers: { "Content-Type": "application/json; charset=UTF-8" },
      });
    } else if (request.method === "POST") {
      const uniqueVal = this.env.ocho.newUniqueId().toString();
      let key = url.searchParams.get("key") || uniqueVal.slice(0, 8);
      let value = url.searchParams.get("value") || uniqueVal.slice(8);

      // Appears to be a bug when writing into storage with an 8 character key.
      // Key get mangled with what appears to be other values. Then gets stuck
      // in a state where that key can no longer be deleted.
      await this.storage.put(key, value);
      return new Response(JSON.stringify({ key, value }, null, 2), {
        headers: { "Content-Type": "application/json; charset=UTF-8" },
      });
    } else if (request.method === "DELETE") {
      const values = await this.storage.list(options);
      const deleted = await this.storage.delete([...values.keys()]);
      return new Response(JSON.stringify({ deleted }), {
        headers: { "Content-Type": "application/json; charset=UTF-8" },
      });
    }
    return new Response("Ocho route not found", { status: 404 });
  }
  _listOptions(url) {
    const options = {
      limit: 100,
    };
    if (url.searchParams.has("start")) {
      options.start = url.searchParams.get("start");
    }
    if (url.searchParams.has("end")) {
      options.end = url.searchParams.get("end");
    }
    if (url.searchParams.has("limit")) {
      options.limit = parseInt(url.searchParams.get("limit"), 10);
    }
    if (url.searchParams.has("reverse")) {
      options.reverse = parseInt(url.searchParams.get("reverse"), 10) === 1;
    }
    return options;
  }
}
