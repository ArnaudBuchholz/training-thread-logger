# training-thread-logger

## Lessons learned

* To create a Worker, a file must (exist and) be executed
* Each Worker as its own execution context : when a module is being imported, it is re-evaluated in each thread
* A BroadcastChannel has "no" memory, when a message is dispatched only the "active" channels receive it
* A BroadcastChannel is a handle that prevents the thread to terminate (it must be closed or unref)
* A Worker execution started when it is "online"
* Only the main thread can hook process events
