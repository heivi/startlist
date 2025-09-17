# Online start list for Aaltonen Online races

This web app loads competitor information from Aaltonen online result service (https://online4.tulospalvelu.fi) (or Navisport (https://navisport.com/events)) and shows a start list by minute. It allows to mark competitors, that have started, and to make changes to their emit number and start time. Those changes are synchronized between clients with the same page open, so result service can update the changes to their system.

The page updates the information from the Aaltonen online only when reloading the page. The updates are sent via socket.io through intermediary server (server.js), which also records the sent messages in case of server reboot etc. that would wipe the history.

Different race can be selected by appending eventid -query parameter to the address, like "<url>?eventid=2024_aland", and the race number (usually day, or otherwise the stage) with raceno parameter. By default it is the current race in the online headers.

The navisport race is selected with query parameter navisportid (for example "<url>?navisportid=55d59689-d0ef-4b8c-afe9-71a92d73e363").

You can also show only some classes (if for example two different starts) by listing wanted classes (short name) in classes query parameter, for example "?classes=H21,D21" after the url.

It is also possible to select a specific start by adding "?start=x" parameter, where x is the start number in the online data. Classes from parameter classes are added also.

A password can also be set for the page, so that only the pages with the same password will show the modifications/updates. The password can be set by query parameter "pw", for example "?pw=password". If no password is set, then it is ignored, and all incoming changes are shown.

Full url example with parameters: https://virekunnas.fi/startlist/?eventid=2024_aland&raceno=1&classes=H21,D21&pw=organizersecret&navisportid=55d59689-d0ef-4b8c-afe9-71a92d73e363

Currently running at https://virekunnas.fi/startlist/.

## TODO
- List of non-started competitors
- Competition selection from list
- Realtime updates from online


Copyright (c) 2024 Heikki Virekunnas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
