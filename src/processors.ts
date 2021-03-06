
import { Program } from './programs';

const fetch = require('node-fetch');

class QProcessor {
  connection: {
    api_key: string,
    user_id: string,
    login: string,
    processor: string,
    token: string
  };

  constructor ({ endpoint='', api_key='', user_id='', login='', token='', processor='simulator' } : { endpoint?: string, api_key?: string, user_id?: string, login?: string, token?: string, processor?: string }) {
    this.connection = { api_key, user_id, login, token, processor };
  }

  run (program: Program, iterations: number, callback: (body: object) => void) {
  }

  devices (callback: (devices: object) => void) {
  }
}

export class RigettiProcessor extends QProcessor {
  endpoint: string;

  constructor ({ endpoint='', api_key='', user_id='', login='', processor='simulator' } : { endpoint?: string, api_key?: string, user_id?: string, login?: string, processor?: string }) {
    super(arguments[0] || {});
    this.endpoint = endpoint || 'https://forest-server.qcs.rigetti.com';
  }

  run (program: Program, iterations: number, callback: (body: object) => void) {
    let payload = {
      type: 'multishot-measure',
      qubits: program.qubitsUsed(),
      trials: iterations,
      'compiled-quil': program.code('quil')
    };
    // if (this.gate_noise) {
    //   payload['gate-noise'] = this.gate_noise;
    // }
    // if (this.measure_noise) {
    //   payload['measurement-noise'] = this.measure_noise;
    // }

    let relevantHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/octet-stream',
      'X-Api-Key': '',
      'X-User-Id': ''
    };
    if (this.connection.processor !== 'simulator') {
      // only send credentials to QPU endpoints, not my QVM docker
      relevantHeaders['X-Api-Key'] = this.connection.api_key;
      relevantHeaders['X-User-Id'] = this.connection.user_id;
    }

    fetch(this.endpoint, {
      method: 'post',
      headers: relevantHeaders,
      body: JSON.stringify(payload)
    })
    .then((res: { json: () => {} }) => res.json())
    .then((body: object) => {
      callback(body);
    });
  }

  devices (callback: (devices: object) => void) {
    fetch(this.endpoint + '/devices').then((res: { json: () => {} }) => res.json())
    .then((jsresponse: { devices: object }) => {
      callback(jsresponse.devices || {});
    });
  }
}

export class IBMProcessor extends QProcessor {
  constructor ({ endpoint='', api_key='', user_id='', login='', processor='simulator' } : { endpoint?: string, api_key?: string, user_id?: string, login?: string, token?: string, processor?: string }) {
    super(arguments[0] || {});
  }

  run (program: Program, iterations: number, callback: (body: object) => void) {
    fetch("https://api.quantum-computing.ibm.com/api/jobs", {
      headers: {
        "X-Access-Token": this.connection.login
      },
      method: 'POST',
      body: JSON.stringify({
        qObject: program.code('qobj'),
        backend: { name: this.connection.processor },
        shots: iterations
      })
    })
    .then((res: { text: () => {} }) => res.text())
    .then((text: string) => {
      console.log(text);
      callback({ t: text });
    });
  }

  devices (callback: (device: Array<{name: string}>) => void) {
    fetch("https://api.quantum-computing.ibm.com/api/Backends", {
        headers: { "X-Access-Token": this.connection.token }
      })
      .then((res: { json: () => {} }) => res.json())
      .then((jsresponse: Array<{name: string}>) => {
        callback(jsresponse);
      });
  }
}
