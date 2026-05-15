# Roman numeral conversion reference

The Roman system uses these letter symbols:

| Symbol | Value |
| ------ | ----- |
| I      | 1     |
| V      | 5     |
| X      | 10    |
| L      | 50    |
| C      | 100   |
| D      | 500   |
| M      | 1000  |

Subtractive pairs (always use these in place of repeating four times):

- IV = 4
- IX = 9
- XL = 40
- XC = 90
- CD = 400
- CM = 900

Algorithm: greedily subtract the largest remaining value while emitting its symbol.
