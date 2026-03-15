export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'api.telegram.org';
    url.protocol = 'https:';
    return fetch(new Request(url.toString(), request));
  }
}
