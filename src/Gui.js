const blessed = require('blessed')
const contrib = require(`blessed-contrib`)

class DashGui {
  constructor() {
    this.screen = blessed.screen()
    this.grid = new contrib.grid({
      rows: 10,
      cols: 10,
      screen: this.screen
    })

    this.screen.key([`escape`, `q`, `C-c`], (ch, key) => {
      return process.exit(0)
    })
  }

  renderTable(props) {
    const {
      title,
      columnWidth,
      tableHeaders
    } = props

    const tableData = props.tableData || []

    this.table = this.grid.set(0, 0, 5, 10, contrib.table, {
      keys: false,
      fg: 'green',
      selectedFg: 'white',
      selectedBg: 'green',
      interactive: false,
      label: title,
      width: '100%',
      height: '100%',
      border: {
        type: 'line',
        fg: 'green'
      },
      columnSpacing: 5,
      columnWidth
    })

    this.table.focus()

    this.tableHeaders = tableHeaders
    this.tableData = tableData

    this.table.setData({
      headers: tableHeaders,
      data: tableData
    })

    this.screen.render()
  }

  addTableRow (row) {
    this.tableData.unshift(row)

    this.table.setData({
      headers: this.tableHeaders,
      data: this.tableData.slice(0, 25)
    })

    this.screen.render()
  }

  renderImageLog(props) {
    const {title} = props

    this.imageLog = this.grid.set(5, 0, 2, 10, contrib.log, {
      fg: `green`,
      selectedFg: `green`,
      label: title
    })

    this.screen.render()
  }

  imageLogAddRow(row) {
    if (row) {
      this.imageLog.log(row)
    }
  }

  renderInfoLog(props) {
    const {title} = props

    this.infoLog = this.grid.set(7, 0, 3, 5, contrib.log, {
      fg: `green`,
      selectedFg: `green`,
      label: title
    })

    this.screen.render()
  }

  infoLogAddRow(row) {
    if (row) {
      this.infoLog.log(row)
    }
  }

  renderConnectionsLog(props) {
    const {title} = props

    this.connectionsLog = this.grid.set(7, 5, 3, 5, contrib.log, {
      fg: `green`,
      selectedFg: `green`,
      label: title
    })

    this.screen.render()
  }

  connectionsLogAddRow(row) {
    this.connectionsLog.log(row)
  }
}

class CsvGui {
  constructor() {

  }

  addRow (row) {
    const formattedRow = row.map(x => {
      if (typeof x === 'object') {
        return JSON.stringify(x)
      }

      return x
    })
    .join('\t')

    console.log(formattedRow)
  }
}

class Gui {
  constructor(type) {
    this.type = type

    const tableHeaders = ['login', 'pass', 'port', 'host', 'dst_ip', 'src_ip', 'mac', 'data']
    const tableData = []

    if (type === 'text') {
      this.gui = new CsvGui()

      this.gui.addRow(tableHeaders)
    } else {
      this.gui = new DashGui()

      this.gui.renderTable({
        title: 'Wall of Sheep',
        tableHeaders,
        tableData,
        columnWidth: [20, 20, 5, 25, 13, 13, 17, 65]
      })

      this.gui.renderImageLog({
        title: 'Images'
      })

      this.gui.renderInfoLog({
        title: 'Info'
      })

      this.gui.renderConnectionsLog({
        title: 'Connections'
      })
    }
  }

  addRow (row) {
    if (this.type === 'text') {
      this.gui.addRow(row)
    } else {
      this.gui.addTableRow(row)
    }
  }

  imageLogAddRow (uri) {
    if (this.type !== 'text') {
      this.gui.imageLogAddRow(uri)
    }
  }

  connectionsLogAddRow (row) {
    if (this.type !== 'text') {
      this.gui.connectionsLogAddRow(row)
    }
  }

  infoLogAddRow(row) {
    if (this.type !== 'text') {
      this.gui.infoLogAddRow(row)
    }
  }
}

module.exports = Gui
