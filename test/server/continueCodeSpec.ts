/*
 * Copyright (c) 2014-2021 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const expect = chai.expect
chai.use(sinonChai)

describe('continueCode', () => {
  const continueCode = require('../../routes/continueCode').continueCode
  const challenges = require('../../data/datacache').challenges

  beforeEach(() => {
    this.req = {}
    this.res = { json: sinon.spy() }
  })

  it('should be undefined when no challenges exist', () => {
    Object.keys(challenges).forEach(key => { delete challenges[key] }) // eslint-disable-line @typescript-eslint/no-dynamic-delete

    continueCode()(this.req, this.res)
    expect(this.res.json).to.have.been.calledWith({ continueCode: undefined })
  })

  it('should be empty when no challenges are solved', () => {
    challenges.c1 = { solved: false }
    challenges.c2 = { solved: false }

    continueCode()(this.req, this.res)
    expect(this.res.json).to.have.been.calledWith({ continueCode: undefined })
  })

  it('should be hashid value of IDs of solved challenges', () => {
    challenges.c1 = { id: 1, solved: true }
    challenges.c2 = { id: 2, solved: true }
    challenges.c3 = { id: 3, solved: false }

    continueCode()(this.req, this.res)
    expect(this.res.json).to.have.been.calledWith({ continueCode: 'yXjv6Z5jWJnzD6a3YvmwPRXK7roAyzHDde2Og19yEN84plqxkMBbLVQrDeoY' })
  })
})
