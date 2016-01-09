window.credit_records = []
window.requests = []

window.generageData = function() {
  var data = [
    {
      commit: 'ccb5c3f944732008d5c8b13a6c928f673bee8126',
      identity: '111111111111111111',
      category: 0,
      state: 0,
      providerName: 'Firm 1',
      providerReputation: 7,
      fee: 10,
      timestamp: 1452268704,
      source: '43b2aa9c63ca995aa6766977fec06067'
    },
    {
      commit: '8e6d63757c4aef7808850728f0c0520a4cce3755',
      identity: '111111111111111111',
      category: 1,
      state: 1,
      providerName: 'Firm 2',
      providerReputation: 8,
      fee: 20,
      timestamp: 1452268704,
      source: '43b2aa9c63ca995aa6766977fec06067'
    },
    {
      commit: 'dd248eae48a38df07eee39e0d5bb7d11ad885f13',
      identity: '111111111111111111',
      category: 2,
      state: 2,
      providerName: 'Firm 3',
      providerReputation: 9,
      fee: 30,
      timestamp: 1452268704,
      source: '43b2aa9c63ca995aa6766977fec06067'
    },
    {
      commit: 'aac65e92e5c17278a2df111dc17042f65a8aca56',
      identity: '111111111111111111',
      category: 1,
      state: 1,
      providerName: 'Firm 4',
      providerReputation: 10,
      fee: 40,
      timestamp: 1452268704,
      source: '43b2aa9c63ca995aa6766977fec06067'
    }
  ]

  for (var i=1; i < data.length; i++) {
    window.credit_records.push(data[i]);
  }

  $.publish('CreditBook:list');
}

// Utils methods
var hexPadding = function(hex, len) {
  for(var i=hex.length; i<len; i++) {
    hex = '0' + hex;
  }
  return hex;
};

var toBytes = function(hex) {
  return '0x'+hex;
};

var toBytes32 = function(hex) {
  return '0x'+hexPadding(hex, 64);
};

var fromBytes32 = function(hex) {
  return hex.replace(/^(0x0*)/, '')
};

var encodeToBytes32 = function(str) {
  return toBytes32(web3.toHex('_v1_'+str).slice(2));
};

var decodeFromBytes32 = function(hex) {
  return web3.toAscii('0x' + fromBytes32(hex)).replace(/^_v1_/, '');
}


var filters = angular.module('neverMoreFilters', [])
filters.filter('categoryFilter', function() {
  return function(input) {
    var result = "";
    switch(input) {
      case 0:
        result = "Credit Loan";
        break;
      case 1:
        result = "Collateral Loan"
        break;
      case 2:
        result = "Guaranteed Loan"
        break;
    }

    return result;
  };
});


filters.filter('stateFilter', function() {
  return function(input) {
    var result = "";
    switch(input) {
      case 0:
        result = "Applying";
        break;
      case 1:
        result = "Ongoing";
        break;
      case 2:
        result = "Complete";
        break;
    }

    return result;
  }
});

var app = angular.module('Nevermore', ['neverMoreFilters']);

app.controller('SearchCtrl', ['$scope', function ($scope) {

  $scope.creditRecords = []

  $.subscribe('CreditBook:list', function() {
    $.each(window.credit_records, function(index, value){
      $scope.creditRecords.push(value);
    });
  });

  $scope.cart = cart = [];

  $scope.changeCart = function($event, cr) {
    var checkbox = $event.target;
    var action = (checkbox.checked ? 'add' : 'remove');
    if (action == 'add') {
      cart.push(cr);
    } else {
      var index = cart.indexOf(cr);
      if (index > -1) {
        cart.splice(index, 1);
      }
    }
  }

  $scope.getTotal = function() {
    var total = 0;
    for (var i = 0; i < $scope.cart.length; i++) {
      total += $scope.cart[i].fee;
    }
    return total;
  }

  $scope.buy = function() {
    var list = [];
    for (var i=0; i < cart.length; i ++) {
      item = cart[i];
      list.push({commit: item.commit, fee: item.fee});
    }

    $.publish('CreditRecord:buy', {list: list});
    $scope.cleanup();
  }

  $scope.cleanup = function() {
    cart.splice(0, cart.length);
  }
}]);


app.controller('CreateCtrl', ['$scope', function ($scope) {

  function SHA256(msg) {
    return CryptoJS.SHA256(msg).toString(CryptoJS.enc.Hex);
  }

  function makeHash(creditRecord) {
    // TODO: make a better rule for generate hash
    var msg = "" + creditRecord.identity + (new Date()).toString()
    return SHA256(msg);
  }

  $scope.categoryOptions = [
    {value: 0, name: 'Credit Loan'},
    {value: 1, name: 'Collateral Loan'},
    {value: 2, name: 'Guaranteed Loan'}
  ];
  $scope.stateOptions = [
    {value: 0, name: 'Applying'},
    {value: 1, name: 'Ongoing'},
    {value: 2, name: 'Complete'}
  ]

  $scope.creditRecord = creditRecord = {};

  $scope.createCreditRecord = function() {
    var metaData = {
      identity: creditRecord.identity,
      hash: makeHash(creditRecord),
      category: creditRecord.category,
      state: creditRecord.state,
      timestamp: Math.floor(new Date() / 1000),
      fee: creditRecord.fee
    }

    credit_book.submit(
      encodeToBytes32(metaData.identity),
      metaData.category,
      metaData.state,
      metaData.fee,
      metaData.timestamp,
      metaData.hash,
      {from: address}
    )

    // close upload modal
    $('#upload-modal').modal('hide');

    // TODO: cleanup after create
    // TODO: store detail data to localStorage
  }

}]);

angular.element(document).ready(function() {
  window.address = web3.eth.accounts[0];
  window.credit_book = CreditBook.deployed();
  window.order_book = OrderBook.deployed();
  order_book.setCreditBook(CreditBook.deployed_address, {from: address});


  // initialize credit records
  credit_book.all({}).  then(function(records){
    if(records[0].length > 0 ) {

      for(var i=0; i<records[0].length; i++) {
        record = {};
        record.provider = records[0][i].toString();
        record.identity = records[1][i].toString();
        record.category = records[2][i].toNumber();
        record.state = records[3][i].toNumber();
        record.fee = records[4][i].toNumber();
        record.timestamp = records[5][i].toNumber();
        record.commit = records[6][i].toString();
        record.orderstate = 0;
        window.credit_records.push(record);
      }

      $.publish("CreditBook:list");
    }
  }).then(function(){
    // initialize requests
    order_book.getAllRequests({}).then(function(result){
      for(var i=0; i < result[0].length; i++) {
        request = {};
        request.id = i;
        request.provider = result[0][i];
        request.from = result[1][i];
        request.commit = result[2][i];
        window.requests.push(request);

        related = false;
        $.each(web3.eth.accounts, function(index, value) {
          if(value === request.from) {
            related = true;
          }
        });

        if(related) {
          $.each(window.credit_records, function(index, record) {
            if(record.commit === request.commit){
              record.orderstate = 1;
            }
          });
        }
      }
    }).then(function(result){
      order_book.getAllResponses({from: address}).then(function(result){
        // order_book.submitResponse(2, 'ffff', "ffff", {from: address})
        //
        $.each(result, function(index, value) {
          if(value !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            var commit = window.requests[index].commit;
            $.each(window.credit_records, function(index, value) {
              if(value === commit) {
                value.orderstate = 2;
              }
            });
          }
        });

      });
      // merge response

    });
  });

  // watch the credit records.

  credit_book.NewRecord({}, { address: CreditBook.deployed_address}, function(error, result) {
    var book = {
      identity: result.args.user,
      category: result.args.category.toNumber(), // 0: 信用贷款 1: 担保贷款  2: 抵押贷款
      state: result.args.state.toNumber(), // 0: 申请中 1: 进行中 2: 已完结
      fee: result.args.fee.toNumber(),
      timestamp: result.args.timestamp.toString(), // unix timestamp
      provider: result.args.provider
    };

    $.publish('CreditBook:create', book);
  });

  // watch request
  order_book.NewRequest({}, { address: OrderBook.deployed_address}, function(error, result) {
    var request = {
    }
  });



  // credit_book.submit('11111111111111111111111111111',0,0,1,2718281828, new Date().getTime().toString(), {from: address});
  // credit_book.submit('11111111111111111111111111111',0,0,1,2718281828, new Date().getTime().toString(), {from: address});




  // buy
  $.subscribe('CreditRecord:buy', function(event, data){
    records = data.list
    for(var i = 0; i < records.length; i++) {
      var fee = records[i].fee;
      var commit = records[i].commit;

      order_book.submitRequest(commit, {value: fee, from: address});
    }
  })

  // Bootstrap Angualr module
  angular.bootstrap(document, ['Nevermore']);
});
